function serializeUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username || "",
    bio: row.bio || "",
    avatarUrl: row.avatar_url || "",
    role: row.role || "user",
    createdAt: row.created_at,
    friendCount: Number(row.friend_count || 0),
    postCount: Number(row.post_count || 0),
    hasCompletedProfile: Boolean(row.username),
  };
}

function serializePost(row) {
  const reactionTotals = Array.isArray(row.reaction_totals) ? row.reaction_totals : [];
  const currentUserReactions = Array.isArray(row.current_user_reactions)
    ? row.current_user_reactions
    : [];
  const proofChainId = row.proof_chain_id ? Number(row.proof_chain_id) : null;
  const proofTxHash = row.proof_tx_hash || "";
  const explorerBaseUrl =
    proofChainId === 11155111 ? "https://sepolia.etherscan.io" : "";

  return {
    id: row.id,
    caption: row.caption || "",
    imageUrl: row.image_url,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      username: row.author_username || "New user",
      avatarUrl: row.author_avatar_url || "",
    },
    isFriendAuthor: Boolean(row.is_friend_author),
    reactionTotals: reactionTotals.map((item) => ({
      type: item.type,
      count: Number(item.count || 0),
    })),
    currentUserReactions,
    proof: {
      isVerified: Boolean(row.is_verified_onchain),
      imageHash: row.image_hash || "",
      contentHash: row.content_hash || "",
      txHash: proofTxHash,
      contractAddress: row.proof_contract_address || "",
      attestedBy: row.proof_attested_by || "",
      blockNumber: row.proof_block_number ? Number(row.proof_block_number) : null,
      chainId: proofChainId,
      recordedAt: row.proof_recorded_at || null,
      explorerUrl:
        explorerBaseUrl && proofTxHash ? `${explorerBaseUrl}/tx/${proofTxHash}` : "",
    },
    nft: {
      isMinted: Boolean(row.is_minted_nft),
      tokenId: row.nft_token_id ? Number(row.nft_token_id) : null,
      txHash: row.nft_tx_hash || "",
      contractAddress: row.nft_contract_address || "",
      chainId: row.nft_chain_id ? Number(row.nft_chain_id) : null,
      blockNumber: row.nft_block_number ? Number(row.nft_block_number) : null,
      mintedAt: row.nft_minted_at || null,
      explorerUrl:
        explorerBaseUrl && row.nft_tx_hash ? `${explorerBaseUrl}/tx/${row.nft_tx_hash}` : "",
    },
  };
}

module.exports = {
  serializePost,
  serializeUser,
};
