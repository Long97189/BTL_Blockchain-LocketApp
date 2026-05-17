module.exports = [
  "function mintMilestone(address recipient,uint256 userIdA,uint256 userIdB,string usernameA,string usernameB,uint8 milestoneType,string milestoneName) external returns (uint256 tokenId)",
  "function getMilestone(uint256 tokenId) external view returns (tuple(uint256 userIdA,uint256 userIdB,string usernameA,string usernameB,uint8 milestoneType,string milestoneName,uint256 mintedAt))",
  "function isClaimed(uint256 userIdA,uint256 userIdB,uint8 milestoneType) external view returns (bool)",
  "function totalSupply() external view returns (uint256)",
  "event MilestoneMinted(uint256 indexed tokenId,uint256 indexed userIdA,uint256 indexed userIdB,uint8 milestoneType,string milestoneName,uint256 mintedAt)",
];
