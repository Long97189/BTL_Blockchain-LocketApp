// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FriendshipMilestone
 * @notice ERC-721 NFT contract for issuing friendship milestone certificates.
 *         Only the platform relayer (owner) can mint — users never need gas.
 *
 *         Milestone types (stored as uint8):
 *           0 = first_friend        — became friends
 *           1 = first_photo         — first photo shared while friends
 *           2 = week_streak         — 7-day interaction streak
 *           3 = month_together      — 30 days as friends
 *           4 = hundred_reactions   — 100 mutual reactions
 *           5 = friend_anniversary  — 1 year as friends
 */
contract FriendshipMilestone {
    /* ── ERC-721 storage ── */
    string public name   = "Locket Friendship Milestone";
    string public symbol = "LFM";

    uint256 private _nextTokenId;

    mapping(uint256 => address)            private _owners;
    mapping(address => uint256)            private _balances;
    mapping(uint256 => address)            private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /* ── Milestone data ── */
    struct MilestoneData {
        uint256 userIdA;
        uint256 userIdB;
        string  usernameA;
        string  usernameB;
        uint8   milestoneType;
        string  milestoneName;
        uint256 mintedAt;
    }

    mapping(uint256 => MilestoneData) public milestones;

    // Prevent duplicate claims: keccak256(userIdA, userIdB, milestoneType) => minted
    mapping(bytes32 => bool) public milestoneClaimed;

    address public owner;

    /* ── Events ── */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event MilestoneMinted(
        uint256 indexed tokenId,
        uint256 indexed userIdA,
        uint256 indexed userIdB,
        uint8   milestoneType,
        string  milestoneName,
        uint256 mintedAt
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        _nextTokenId = 1;
    }

    /* ── ERC-721 minimal interface ── */

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "Zero address");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "Token does not exist");
        return o;
    }

    function approve(address to, uint256 tokenId) external {
        address o = ownerOf(tokenId);
        require(msg.sender == o || _operatorApprovals[o][msg.sender], "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(o, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) external view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(to != address(0), "Transfer to zero address");
        address o = ownerOf(tokenId);
        require(from == o, "From is not owner");
        require(
            msg.sender == o ||
            _tokenApprovals[tokenId] == msg.sender ||
            _operatorApprovals[o][msg.sender],
            "Not authorized"
        );
        _tokenApprovals[tokenId] = address(0);
        _balances[from] -= 1;
        _balances[to]   += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x80ac58cd || interfaceId == 0x01ffc9a7;
    }

    /* ── Platform mint ── */

    /**
     * @notice Mints a friendship milestone certificate NFT.
     * @param recipient      Wallet to receive the NFT.
     * @param userIdA        Database user id of friend A (smaller id first).
     * @param userIdB        Database user id of friend B.
     * @param usernameA      Username of friend A at mint time.
     * @param usernameB      Username of friend B at mint time.
     * @param milestoneType  Numeric milestone type (0-5).
     * @param milestoneName  Human-readable milestone name.
     * @return tokenId       The newly minted token id.
     */
    function mintMilestone(
        address recipient,
        uint256 userIdA,
        uint256 userIdB,
        string  calldata usernameA,
        string  calldata usernameB,
        uint8   milestoneType,
        string  calldata milestoneName
    ) external onlyOwner returns (uint256 tokenId) {
        require(recipient != address(0), "Recipient cannot be zero");
        require(userIdA != 0 && userIdB != 0, "User ids cannot be zero");

        // Normalize pair order so (A,B) == (B,A) for dedup
        (uint256 lo, uint256 hi) = userIdA < userIdB
            ? (userIdA, userIdB)
            : (userIdB, userIdA);

        bytes32 key = keccak256(abi.encodePacked(lo, hi, milestoneType));
        require(!milestoneClaimed[key], "Milestone already claimed");

        tokenId = _nextTokenId++;
        _owners[tokenId] = recipient;
        _balances[recipient] += 1;

        milestones[tokenId] = MilestoneData({
            userIdA:       userIdA,
            userIdB:       userIdB,
            usernameA:     usernameA,
            usernameB:     usernameB,
            milestoneType: milestoneType,
            milestoneName: milestoneName,
            mintedAt:      block.timestamp
        });
        milestoneClaimed[key] = true;

        emit Transfer(address(0), recipient, tokenId);
        emit MilestoneMinted(tokenId, userIdA, userIdB, milestoneType, milestoneName, block.timestamp);
    }

    /**
     * @notice Check whether a milestone has already been claimed.
     */
    function isClaimed(uint256 userIdA, uint256 userIdB, uint8 milestoneType) external view returns (bool) {
        (uint256 lo, uint256 hi) = userIdA < userIdB
            ? (userIdA, userIdB)
            : (userIdB, userIdA);
        return milestoneClaimed[keccak256(abi.encodePacked(lo, hi, milestoneType))];
    }

    function getMilestone(uint256 tokenId) external view returns (MilestoneData memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return milestones[tokenId];
    }

    function totalSupply() external view returns (uint256) { return _nextTokenId - 1; }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero");
        owner = newOwner;
    }
}
