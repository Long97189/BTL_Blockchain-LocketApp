module.exports = [
  "function recordPostProof(uint256 appPostId,uint256 authorUserId,string authorUsername,bytes32 imageHash,bytes32 contentHash,string imageUrl,uint256 appCreatedAt) external",
  "function getPostProof(uint256 appPostId) external view returns (tuple(uint256 appPostId,uint256 authorUserId,string authorUsername,bytes32 imageHash,bytes32 contentHash,string imageUrl,uint256 appCreatedAt,uint256 attestedAt,address attestedBy,bool exists))",
];
