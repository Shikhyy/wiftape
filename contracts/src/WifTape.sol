// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal ERC-20 surface used by WifTape.
interface IERC20Like {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Optional burn hook, used when the $WIF token exposes `burn(uint256)`.
interface IBurnable {
    function burn(uint256 amount) external;
}

/// @notice Chainlink aggregator surface.
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @notice The two Stock Token functions WifTape reads. Both live on the Stock Token itself (not on the
///         Chainlink feed). `oraclePaused` is true while a corporate action is being processed.
///         `uiMultiplier` is the 1e18 fixed-point multiplier that dividend reinvestment and splits change.
interface IStockToken {
    function oraclePaused() external view returns (bool);
    function uiMultiplier() external view returns (uint256);
}

/// @title WifTape
/// @notice Round-based "up or down" prediction game on Stock Token prices, staked in $WIF.
///         A fixed share of every round's losing pool is burned. Winners split the rest of the
///         losing pool, weighted by their win streak. There is no house edge and no fee recipient.
/// @dev    Trust model: the owner can only add markets or switch a market on/off. The owner can
///         never move, freeze or redirect staked funds. Anyone can open, settle and void rounds.
///         See docs/03-CONTRACTS.md for the full threat model.
contract WifTape {
    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/

    enum Side { None, Up, Down }
    enum Status { None, Open, Settled, Void }

    struct Market {
        AggregatorV3Interface feed;
        uint32 entryWindow; // seconds players may enter after a round opens
        uint32 duration; // seconds from open to close
        uint32 maxStaleness; // max feed age (seconds) allowed when opening a round
        uint32 maxSettleLag; // max seconds after close that a price update still counts
        bool active;
        string symbol;
        address stockToken; // optional: the Stock Token behind the feed. Enables the corporate-action guard. Zero disables it
    }

    struct Round {
        uint32 marketId;
        Status status;
        Side winner;
        uint64 openTime;
        uint64 lockTime;
        uint64 endTime;
        int256 openPrice;
        int256 closePrice;
        uint256 totalUp;
        uint256 totalDown;
        uint256 weightUp;
        uint256 weightDown;
        uint256 burned;
    }

    struct Player {
        uint32 streak;
        uint32 bestStreak;
        uint32 wins;
        uint32 played;
        uint8 shields;
        bool joined;
        bool referralPaid;
        address referrer;
        uint256 pendingRound; // last round entered whose result is not yet folded into the streak
    }

    struct Position {
        Side side;
        bool claimed;
        uint256 amount;
        uint256 weight;
    }

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BPS = 10_000;
    uint256 public constant STREAK_BONUS_BPS = 500; // +5% weight per streak step
    uint256 public constant MAX_STREAK_STEPS = 10; // caps the bonus at +50%
    uint8 public constant MAX_SHIELDS = 3;
    uint256 public constant VOID_GRACE = 1 hours; // extra wait before an unsettled round can be voided
    uint256 public constant MAX_BURN_BPS = 2_000;

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    IERC20Like public immutable wif;
    bool public immutable useBurnFunction; // true: call wif.burn(); false: send to DEAD
    uint16 public immutable burnBps; // share of each round's losing pool that is burned
    uint256 public immutable minStake;

    address public owner;
    uint256 private _lock = 1;

    Market[] public markets;
    mapping(uint256 => uint256) public currentRound; // marketId => latest roundId
    uint256 public roundCount;
    mapping(uint256 => Round) internal _rounds;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(address => Player) public players;
    /// @notice The Stock Token multiplier recorded when a guarded round opened (0 for unguarded markets).
    mapping(uint256 => uint256) public openMultiplier;

    // Global stats for the public burn dashboard.
    uint256 public totalBurned;
    uint256 public totalStaked;
    uint256 public roundsSettled;
    uint256 public uniquePlayers;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event MarketAdded(uint256 indexed marketId, address feed, string symbol, uint32 entryWindow, uint32 duration);
    event MarketActive(uint256 indexed marketId, bool active);
    event RoundOpened(uint256 indexed roundId, uint256 indexed marketId, int256 openPrice, uint64 lockTime, uint64 endTime);
    event Entered(uint256 indexed roundId, address indexed player, Side side, uint256 amount, uint256 weight);
    event Settled(uint256 indexed roundId, Side winner, int256 closePrice, uint256 burned);
    event Voided(uint256 indexed roundId, string reason);
    event Claimed(uint256 indexed roundId, address indexed player, uint256 payout);
    event StreakUpdated(address indexed player, uint32 streak, uint8 shields, bool won);
    event Burned(uint256 indexed roundId, uint256 amount);
    event OwnershipTransferred(address indexed from, address indexed to);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier nonReentrant() {
        require(_lock == 1, "REENTRANT");
        _lock = 2;
        _;
        _lock = 1;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @param wif_ the $WIF token address on Robinhood Chain
    /// @param useBurnFunction_ true if the token has `burn(uint256)`; false to send to the dead address
    /// @param burnBps_ share of each losing pool to burn, in basis points (max 2000)
    /// @param minStake_ smallest allowed entry, in token base units
    /// @param owner_ address allowed to add markets (cannot touch funds)
    constructor(address wif_, bool useBurnFunction_, uint16 burnBps_, uint256 minStake_, address owner_) {
        require(wif_ != address(0) && owner_ != address(0), "ZERO_ADDRESS");
        require(burnBps_ <= MAX_BURN_BPS, "BURN_TOO_HIGH");
        wif = IERC20Like(wif_);
        useBurnFunction = useBurnFunction_;
        burnBps = burnBps_;
        minStake = minStake_;
        owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
    }

    /*//////////////////////////////////////////////////////////////
                                 ADMIN
    //////////////////////////////////////////////////////////////*/

    /// @notice Add a new market backed by a Chainlink feed. Owner only.
    /// @param stockToken optional Stock Token address. When set, rounds cannot open or settle while its oracle is
    ///        paused, and a round whose `uiMultiplier` changed mid-round is voided and refunded. Pass zero to skip.
    function addMarket(
        address feed,
        string calldata symbol,
        uint32 entryWindow,
        uint32 duration,
        uint32 maxStaleness,
        uint32 maxSettleLag,
        address stockToken
    ) external onlyOwner returns (uint256 marketId) {
        require(feed != address(0), "ZERO_FEED");
        require(entryWindow > 0 && duration > entryWindow, "BAD_WINDOWS");
        require(maxStaleness > 0 && maxSettleLag > 0, "BAD_LIMITS");
        marketId = markets.length;
        markets.push(
            Market(AggregatorV3Interface(feed), entryWindow, duration, maxStaleness, maxSettleLag, true, symbol, stockToken)
        );
        emit MarketAdded(marketId, feed, symbol, entryWindow, duration);
    }

    /// @notice Switch a market on or off. Open rounds still settle normally. Owner only.
    function setMarketActive(uint256 marketId, bool active) external onlyOwner {
        markets[marketId].active = active;
        emit MarketActive(marketId, active);
    }

    /// @notice Hand ownership to a new address (use a multisig).
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /*//////////////////////////////////////////////////////////////
                              ROUND LIFECYCLE
    //////////////////////////////////////////////////////////////*/

    /// @notice Open the next round for a market. Anyone can call. Reverts if the feed price is stale
    ///         (for example outside market hours) or if the previous round is still open.
    function openRound(uint256 marketId) external returns (uint256 roundId) {
        Market storage m = markets[marketId];
        require(m.active, "MARKET_OFF");
        uint256 cur = currentRound[marketId];
        require(cur == 0 || _rounds[cur].status != Status.Open, "ROUND_ACTIVE");

        (int256 price, uint256 updatedAt) = _price(m.feed);
        require(block.timestamp - updatedAt <= m.maxStaleness, "STALE_PRICE");

        // Corporate-action guard: do not open while the Stock Token's oracle is paused.
        uint256 multiplier;
        if (m.stockToken != address(0)) {
            require(!IStockToken(m.stockToken).oraclePaused(), "ORACLE_PAUSED");
            multiplier = IStockToken(m.stockToken).uiMultiplier();
        }

        roundId = ++roundCount;
        openMultiplier[roundId] = multiplier;
        currentRound[marketId] = roundId;
        Round storage r = _rounds[roundId];
        r.marketId = uint32(marketId);
        r.status = Status.Open;
        r.openTime = uint64(block.timestamp);
        r.lockTime = uint64(block.timestamp + m.entryWindow);
        r.endTime = uint64(block.timestamp + m.duration);
        r.openPrice = price;
        emit RoundOpened(roundId, marketId, price, r.lockTime, r.endTime);
    }

    /// @notice Stake $WIF on a side of an open round. Requires prior token approval.
    /// @param referrer optional address that earns a streak shield when you finish your first round
    function enter(uint256 roundId, Side side, uint256 amount, address referrer) external nonReentrant {
        Round storage r = _rounds[roundId];
        require(r.status == Status.Open, "NOT_OPEN");
        require(block.timestamp < r.lockTime, "ENTRY_CLOSED");
        require(side == Side.Up || side == Side.Down, "BAD_SIDE");
        require(amount >= minStake, "BELOW_MIN");

        Player storage p = players[msg.sender];
        if (!p.joined) {
            p.joined = true;
            uniquePlayers++;
            if (referrer != address(0) && referrer != msg.sender) p.referrer = referrer;
        }

        // Fold the previous round's result into the streak before entering a new round.
        uint256 pending = p.pendingRound;
        if (pending != 0 && pending != roundId) {
            Status s = _rounds[pending].status;
            require(s == Status.Settled || s == Status.Void, "PREV_UNRESOLVED");
            _foldResult(msg.sender, pending);
        }

        Position storage pos = positions[roundId][msg.sender];
        require(pos.side == Side.None || pos.side == side, "OTHER_SIDE");

        uint256 weight = (amount * streakMultiplierBps(p.streak)) / BPS;
        pos.side = side;
        pos.amount += amount;
        pos.weight += weight;
        p.pendingRound = roundId;
        totalStaked += amount;

        if (side == Side.Up) {
            r.totalUp += amount;
            r.weightUp += weight;
        } else {
            r.totalDown += amount;
            r.weightDown += weight;
        }

        _pull(msg.sender, amount);
        emit Entered(roundId, msg.sender, side, amount, weight);
    }

    /// @notice Settle a round after it ends. Anyone can call. Uses the first usable price update
    ///         at or after the end time (within `maxSettleLag`). Ties and one-sided rounds are voided
    ///         and fully refunded, with nothing burned.
    function settle(uint256 roundId) external nonReentrant {
        Round storage r = _rounds[roundId];
        require(r.status == Status.Open, "NOT_OPEN");
        require(block.timestamp >= r.endTime, "NOT_ENDED");

        Market storage m = markets[r.marketId];
        (int256 price, uint256 updatedAt) = _price(m.feed);
        require(updatedAt >= r.endTime && updatedAt <= uint256(r.endTime) + m.maxSettleLag, "NO_VALID_PRICE");

        // Corporate-action guard. A paused oracle blocks settlement (the round can still be voided after the
        // grace period). A changed multiplier means the feed price moved for a non-market reason, so refund.
        if (m.stockToken != address(0)) {
            require(!IStockToken(m.stockToken).oraclePaused(), "ORACLE_PAUSED");
            if (IStockToken(m.stockToken).uiMultiplier() != openMultiplier[roundId]) {
                r.closePrice = price;
                return _void(roundId, r, "MULTIPLIER_CHANGED");
            }
        }
        r.closePrice = price;

        if (price == r.openPrice) return _void(roundId, r, "TIE");
        if (r.totalUp == 0 || r.totalDown == 0) return _void(roundId, r, "ONE_SIDED");

        Side winner = price > r.openPrice ? Side.Up : Side.Down;
        uint256 losersTotal = winner == Side.Up ? r.totalDown : r.totalUp;
        uint256 burnAmount = (losersTotal * burnBps) / BPS;

        r.status = Status.Settled;
        r.winner = winner;
        r.burned = burnAmount;
        roundsSettled++;
        totalBurned += burnAmount;

        if (burnAmount > 0) {
            _burn(burnAmount);
            emit Burned(roundId, burnAmount);
        }
        emit Settled(roundId, winner, price, burnAmount);
    }

    /// @notice Void a round that could not be settled (no valid price after the grace period).
    ///         Everyone can then claim a full refund. Anyone can call.
    function voidRound(uint256 roundId) external {
        Round storage r = _rounds[roundId];
        require(r.status == Status.Open, "NOT_OPEN");
        Market storage m = markets[r.marketId];
        require(block.timestamp >= uint256(r.endTime) + m.maxSettleLag + VOID_GRACE, "TOO_EARLY");
        _void(roundId, r, "NO_PRICE");
    }

    /// @notice Collect winnings (or a refund for a void round) and update your streak.
    function claim(uint256 roundId) external nonReentrant returns (uint256 payout) {
        Round storage r = _rounds[roundId];
        require(r.status == Status.Settled || r.status == Status.Void, "NOT_FINAL");
        Position storage pos = positions[roundId][msg.sender];
        require(pos.amount > 0 && !pos.claimed, "NOTHING_TO_CLAIM");
        pos.claimed = true;

        payout = _payoutOf(r, pos);

        if (players[msg.sender].pendingRound == roundId) _foldResult(msg.sender, roundId);

        if (payout > 0) _push(msg.sender, payout);
        emit Claimed(roundId, msg.sender, payout);
    }

    /*//////////////////////////////////////////////////////////////
                                  VIEWS
    //////////////////////////////////////////////////////////////*/

    /// @notice Full round data (the public getter for the mapping would hide the struct layout).
    function getRound(uint256 roundId) external view returns (Round memory) {
        return _rounds[roundId];
    }

    function marketsCount() external view returns (uint256) {
        return markets.length;
    }

    /// @notice What `claim` would pay out right now. Zero if nothing is claimable.
    function claimable(uint256 roundId, address user) external view returns (uint256) {
        Round storage r = _rounds[roundId];
        Position storage pos = positions[roundId][user];
        if ((r.status != Status.Settled && r.status != Status.Void) || pos.claimed || pos.amount == 0) return 0;
        return _payoutOf(r, pos);
    }

    /// @notice Weight multiplier in basis points for a given streak (10000 = 1.0x, max 15000).
    function streakMultiplierBps(uint32 streak) public pure returns (uint256) {
        uint256 steps = streak > MAX_STREAK_STEPS ? MAX_STREAK_STEPS : streak;
        return BPS + steps * STREAK_BONUS_BPS;
    }

    /*//////////////////////////////////////////////////////////////
                               INTERNALS
    //////////////////////////////////////////////////////////////*/

    function _payoutOf(Round storage r, Position storage pos) internal view returns (uint256) {
        if (r.status == Status.Void) return pos.amount;
        if (pos.side != r.winner) return 0;
        uint256 losersTotal = r.winner == Side.Up ? r.totalDown : r.totalUp;
        uint256 winnerWeight = r.winner == Side.Up ? r.weightUp : r.weightDown;
        uint256 pot = losersTotal - r.burned;
        return pos.amount + (pot * pos.weight) / winnerWeight;
    }

    /// @dev Fold a finished round's result into the player's streak. Void rounds change nothing.
    function _foldResult(address user, uint256 roundId) internal {
        Player storage p = players[user];
        p.pendingRound = 0;
        Round storage r = _rounds[roundId];
        if (r.status != Status.Settled) return;

        bool won = positions[roundId][user].side == r.winner;
        p.played++;
        if (won) {
            p.wins++;
            p.streak++;
            if (p.streak > p.bestStreak) p.bestStreak = p.streak;
        } else if (p.shields > 0) {
            p.shields--;
        } else {
            p.streak = 0;
        }

        // First finished round pays the referrer one streak shield (capped).
        if (!p.referralPaid && p.referrer != address(0)) {
            p.referralPaid = true;
            Player storage ref = players[p.referrer];
            if (ref.shields < MAX_SHIELDS) ref.shields++;
        }
        emit StreakUpdated(user, p.streak, p.shields, won);
    }

    function _void(uint256 roundId, Round storage r, string memory reason) internal {
        r.status = Status.Void;
        emit Voided(roundId, reason);
    }

    function _price(AggregatorV3Interface feed) internal view returns (int256 price, uint256 updatedAt) {
        (, price,, updatedAt,) = feed.latestRoundData();
        require(price > 0, "BAD_PRICE");
    }

    function _burn(uint256 amount) internal {
        if (useBurnFunction) {
            IBurnable(address(wif)).burn(amount);
        } else {
            _push(DEAD, amount);
        }
    }

    function _pull(address from, uint256 amount) internal {
        (bool ok, bytes memory data) = address(wif).call(
            abi.encodeWithSelector(IERC20Like.transferFrom.selector, from, address(this), amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "PULL_FAILED");
    }

    function _push(address to, uint256 amount) internal {
        (bool ok, bytes memory data) =
            address(wif).call(abi.encodeWithSelector(IERC20Like.transfer.selector, to, amount));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "PUSH_FAILED");
    }
}
