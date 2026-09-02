import { Code, ConnectError } from "@connectrpc/connect";

export { Code, ConnectError };

/**
 * 예외가 바른 서버가 돌려준 오류인지 본다.
 *
 * `fetch` 자체가 실패한 경우(주소 오타·서버 미기동·CORS)도 connect-es 가
 * `ConnectError` 로 감싸 `Code.Unavailable` 로 준다.
 *
 * @param e 잡은 예외
 * @returns ConnectError 면 true
 */
export function isBareunError(e: unknown): e is ConnectError {
  return e instanceof ConnectError;
}

/**
 * 오류를 사람이 읽는 한국어 문장으로 바꾼다.
 *
 * 서버 메시지를 그대로 보여 주면 원인을 짚기 어려운 코드들이 있어, 그 앞에 무엇을
 * 확인해야 하는지를 붙인다.
 *
 * @param e 잡은 예외
 * @returns 설명 문장
 */
export function describeError(e: unknown): string {
  if (!isBareunError(e)) {
    return e instanceof Error ? e.message : String(e);
  }
  switch (e.code) {
    case Code.Unavailable:
      return `바른 서버에 접속하지 못했습니다. 주소와 기동 상태를 확인하세요: ${e.rawMessage}`;
    case Code.PermissionDenied:
    case Code.Unauthenticated:
      return `API 키가 유효하지 않거나 라이선스가 만료되었습니다: ${e.rawMessage}`;
    case Code.Unimplemented:
      return `이 서버는 요청한 기능을 제공하지 않습니다. 교정과 사전 검색은 맞춤법 교정(rev) 빌드에서만 동작합니다: ${e.rawMessage}`;
    case Code.ResourceExhausted:
      return `사용량 한도를 넘었습니다: ${e.rawMessage}`;
    default:
      return e.rawMessage;
  }
}
