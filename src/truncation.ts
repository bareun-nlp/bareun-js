import type { Truncation } from "./gen/bareun/lang_common_pb.js";

/**
 * 요청 글이 서버 기준보다 길어 앞부분만 처리됐을 때의 정보.
 *
 * 서버는 글이 기준(운영 서버는 9,000자)을 넘으면 거절하지 않고 앞 5,000자 안팎만
 * 처리한 뒤 이 정보를 응답에 싣는다. 기준 안의 글에는 아예 붙지 않는다.
 * 글자 수는 유니코드 코드 포인트 기준이다.
 */
export interface TruncationInfo {
  /** 요청 글 전체의 글자 수 */
  originalChars: number;
  /** 처리한 글자 수(앞부분) */
  processedChars: number;
  /** 처리하지 않고 버린 글자 수 */
  droppedChars: number;
  /**
   * 버린 구간이 시작하는 위치. 이 클라이언트는 UTF-16 으로 요청하므로
   * `text.slice(droppedBeginOffset)` 이 처리되지 않은 뒷부분이다.
   * AnalyzeSyntaxList 는 {@link TruncationInfo.droppedBeginSentenceIndex} 번째 문장 안의 위치다.
   */
  droppedBeginOffset: number;
  /** 서버가 준 안내 문구(한국어, 괄호 안에 영어) */
  message: string;
  /** 문장 끝·공백을 못 찾아 글자 중간에서 잘랐으면 true. 마지막 어절의 결과는 믿기 어렵다. */
  cutMidWord: boolean;
  /** AnalyzeSyntaxList 에서만 있다. 버린 구간이 시작하는 문장의 번호(0부터). */
  droppedBeginSentenceIndex?: number;
}

/**
 * 응답의 `truncation` 을 다루기 쉬운 객체로 바꾼다.
 *
 * @param truncation 응답의 `truncation` 필드. 잘리지 않았으면 undefined
 * @param droppedBeginSentenceIndex AnalyzeSyntaxList 응답의 같은 이름 필드
 * @returns 잘렸으면 정보, 아니면 undefined
 */
export function toTruncationInfo(
  truncation: Truncation | undefined,
  droppedBeginSentenceIndex?: number,
): TruncationInfo | undefined {
  if (!truncation) {
    return undefined;
  }
  const info: TruncationInfo = {
    originalChars: truncation.originalChars,
    processedChars: truncation.processedChars,
    droppedChars: truncation.droppedChars,
    droppedBeginOffset: truncation.droppedBeginOffset,
    message: truncation.message,
    cutMidWord: truncation.cutMidWord,
  };
  if (droppedBeginSentenceIndex !== undefined) {
    info.droppedBeginSentenceIndex = droppedBeginSentenceIndex;
  }
  return info;
}
