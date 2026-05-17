// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PostProofRegistry {
    struct PostProof {
        uint256 appPostId;
        uint256 authorUserId;
        string authorUsername;
        bytes32 imageHash;
        bytes32 contentHash;
        string imageUrl;
        uint256 appCreatedAt;
        uint256 attestedAt;
        address attestedBy;
        bool exists;
    }

    address public owner;
    mapping(uint256 => PostProof) private postProofs;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PostProofRecorded(
        uint256 indexed appPostId,
        uint256 indexed authorUserId,
        bytes32 indexed contentHash,
        string authorUsername,
        bytes32 imageHash,
        string imageUrl,
        uint256 appCreatedAt,
        uint256 attestedAt,
        address attestedBy
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @notice Transfers contract ownership to another platform wallet.
     * @param newOwner The next platform wallet that can record proofs.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Records a blockchain proof for an app post.
     * @param appPostId The database post identifier from the social app.
     * @param authorUserId The database user identifier of the original author.
     * @param authorUsername The username of the original author at attestation time.
     * @param imageHash The SHA-256 hash of the normalized image bytes.
     * @param contentHash The SHA-256 hash of the full proof payload.
     * @param imageUrl The storage URL used by the application for the image asset.
     * @param appCreatedAt The original application timestamp for the post.
     */
    function recordPostProof(
        uint256 appPostId,
        uint256 authorUserId,
        string calldata authorUsername,
        bytes32 imageHash,
        bytes32 contentHash,
        string calldata imageUrl,
        uint256 appCreatedAt
    ) external onlyOwner {
        require(appPostId != 0, "Post id cannot be zero");
        require(authorUserId != 0, "Author id cannot be zero");
        require(bytes(authorUsername).length != 0, "Username cannot be empty");
        require(imageHash != bytes32(0), "Image hash cannot be empty");
        require(contentHash != bytes32(0), "Content hash cannot be empty");
        require(bytes(imageUrl).length != 0, "Image URL cannot be empty");
        require(appCreatedAt != 0, "App timestamp cannot be empty");
        require(!postProofs[appPostId].exists, "Post proof already exists");

        postProofs[appPostId] = PostProof({
            appPostId: appPostId,
            authorUserId: authorUserId,
            authorUsername: authorUsername,
            imageHash: imageHash,
            contentHash: contentHash,
            imageUrl: imageUrl,
            appCreatedAt: appCreatedAt,
            attestedAt: block.timestamp,
            attestedBy: msg.sender,
            exists: true
        });

        emit PostProofRecorded(
            appPostId,
            authorUserId,
            contentHash,
            authorUsername,
            imageHash,
            imageUrl,
            appCreatedAt,
            block.timestamp,
            msg.sender
        );
    }

    /**
     * @notice Returns the on-chain proof for an app post.
     * @param appPostId The database post identifier from the social app.
     * @return proof The stored blockchain proof payload.
     */
    function getPostProof(uint256 appPostId) external view returns (PostProof memory proof) {
        require(postProofs[appPostId].exists, "Post proof does not exist");
        return postProofs[appPostId];
    }
}
