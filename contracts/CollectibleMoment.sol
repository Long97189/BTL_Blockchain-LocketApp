// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CollectibleMoment
 * @notice Minimal ERC-721 NFT contract for minting special social posts
 *         as on-chain collectible moments.  Only the platform relayer
 *         (contract owner) can mint, so end-users never need gas.
 *
 *         Each token stores lightweight metadata on-chain:
 *           - appPostId    → database post id in the social app
 *           - authorUserId → database user id of the original author
 *           - imageUrl     → off-chain image URL (Cloudinary / uploads)
 *           - caption      → post caption at mint time
 *           - contentHash  → SHA-256 fingerprint of the post payload
 *           - mintedAt     → block.timestamp when the NFT was created
 */
contract CollectibleMoment {
    /* ── ERC-721 storage ── */
    string public name   = "Locket Collectible Moment";
    string public symbol = "LCM";

    uint256 private _nextTokenId;

    mapping(uint256 => address)            private _owners;
    mapping(address => uint256)            private _balances;
    mapping(uint256 => address)            private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /* ── Moment metadata ── */
    struct MomentData {
        uint256 appPostId;
        uint256 authorUserId;
        string  imageUrl;
        string  caption;
        bytes32 contentHash;
        uint256 mintedAt;
    }

    mapping(uint256 => MomentData) public moments;
    mapping(uint256 => bool)       public postMinted;   // appPostId => already minted?

    address public owner;

    /* ── Events (ERC-721 + custom) ── */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event MomentMinted(
        uint256 indexed tokenId,
        uint256 indexed appPostId,
        uint256 indexed authorUserId,
        address recipient,
        bytes32 contentHash,
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

    /* ────────────────────────────────────────────────────
       ERC-721 minimal interface
       ──────────────────────────────────────────────────── */

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "Zero address");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }

    function approve(address to, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        require(msg.sender == tokenOwner || _operatorApprovals[tokenOwner][msg.sender],
                "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
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
        address tokenOwner = ownerOf(tokenId);
        require(from == tokenOwner, "From is not owner");
        require(
            msg.sender == tokenOwner ||
            _tokenApprovals[tokenId] == msg.sender ||
            _operatorApprovals[tokenOwner][msg.sender],
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

    /// @dev ERC-165
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x01ffc9a7;   // ERC-165
    }

    /* ────────────────────────────────────────────────────
       Platform mint — only the relayer wallet can call
       ──────────────────────────────────────────────────── */

    /**
     * @notice Mints a Collectible Moment NFT for a specific post.
     * @param recipient     The wallet that will own the NFT (platform-assigned).
     * @param appPostId     Database post id.
     * @param authorUserId  Database user id of the post author.
     * @param imageUrl      Off-chain image URL.
     * @param caption       Post caption text.
     * @param contentHash   SHA-256 hash of the post payload.
     * @return tokenId      The newly minted token id.
     */
    function mintMoment(
        address recipient,
        uint256 appPostId,
        uint256 authorUserId,
        string  calldata imageUrl,
        string  calldata caption,
        bytes32 contentHash
    ) external onlyOwner returns (uint256 tokenId) {
        require(recipient  != address(0), "Recipient cannot be zero");
        require(appPostId  != 0,          "Post id cannot be zero");
        require(!postMinted[appPostId],   "Post already minted");

        tokenId = _nextTokenId++;
        _owners[tokenId]  = recipient;
        _balances[recipient] += 1;

        moments[tokenId] = MomentData({
            appPostId:    appPostId,
            authorUserId: authorUserId,
            imageUrl:     imageUrl,
            caption:      caption,
            contentHash:  contentHash,
            mintedAt:     block.timestamp
        });
        postMinted[appPostId] = true;

        emit Transfer(address(0), recipient, tokenId);
        emit MomentMinted(
            tokenId,
            appPostId,
            authorUserId,
            recipient,
            contentHash,
            block.timestamp
        );
    }

    /**
     * @notice Returns on-chain metadata for a minted moment.
     * @param tokenId The NFT token id.
     * @return data The stored moment metadata.
     */
    function getMoment(uint256 tokenId) external view returns (MomentData memory data) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return moments[tokenId];
    }

    /**
     * @notice Returns the total number of tokens minted so far.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @notice Transfers contract ownership to another platform wallet.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero");
        owner = newOwner;
    }
}
