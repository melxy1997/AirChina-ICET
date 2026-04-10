import type { SampleParsedContent } from '@icet/shared';

export interface SignatureCheckResult {
  found: boolean;
  details: {
    signerRole: string;
    found: boolean;
    matchedSignature?: {
      signerHint: string;
      confidence: number;
      page: number;
    };
  }[];
  summary: string;
}

/**
 * Tool: check_signature
 * 检查样本中是否存在指定角色的签名/签字
 */
export function checkSignature(
  signerRole: string,
  parsedContent: SampleParsedContent,
): SignatureCheckResult {
  const signatures = parsedContent.signatures ?? [];
  const details: SignatureCheckResult['details'] = [];

  // Fuzzy match signer role against detected signatures
  const matchedSignatures = signatures.filter((sig) => {
    const hint = sig.signerHint?.toLowerCase() ?? '';
    const role = signerRole.toLowerCase();
    return hint.includes(role) || role.includes(hint);
  });

  details.push({
    signerRole,
    found: matchedSignatures.length > 0,
    matchedSignature: matchedSignatures.length > 0
      ? {
          signerHint: matchedSignatures[0].signerHint,
          confidence: matchedSignatures[0].confidence,
          page: matchedSignatures[0].location?.page ?? 0,
        }
      : undefined,
  });

  const found = matchedSignatures.length > 0;

  return {
    found,
    details,
    summary: found
      ? `在第 ${matchedSignatures[0].location?.page} 页发现 "${matchedSignatures[0].signerHint}" 的签字`
      : `未在文档中找到 "${signerRole}" 的签字`,
  };
}
