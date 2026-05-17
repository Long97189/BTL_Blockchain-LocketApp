module.exports = [
  "function mintMoment(address recipient,uint256 appPostId,uint256 authorUserId,string imageUrl,string caption,bytes32 contentHash) external returns (uint256 tokenId)",
  "function getMoment(uint256 tokenId) external view returns (tuple(uint256 appPostId,uint256 authorUserId,string imageUrl,string caption,bytes32 contentHash,uint256 mintedAt))",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function postMinted(uint256 appPostId) external view returns (bool)",
  "function totalSupply() external view returns (uint256)",
  "event MomentMinted(uint256 indexed tokenId,uint256 indexed appPostId,uint256 indexed authorUserId,address recipient,bytes32 contentHash,uint256 mintedAt)",
];
