import type { BareunClient } from "./client.js";
import { EncodingType } from "./gen/bareun/lang_common_pb.js";
import {
  Morpheme_Tag,
  type AnalyzeSyntaxResponse,
  type Morpheme,
} from "./gen/bareun/language_service_pb.js";

/**
 * 자바스크립트 문자열은 UTF-16 이다.
 *
 * 서버가 돌려주는 `beginOffset`·`length` 를 그대로 `String.prototype.slice` 에
 * 넣으려면 이 인코딩이어야 한다. UTF8 로 받으면 한글이 섞인 문장에서 위치가
 * 어긋나는데, 오류가 아니라 엉뚱한 글자를 잘라 내므로 알아채기 어렵다.
 */
export const JS_ENCODING = EncodingType.UTF16;

/** 의미가 부여된 형태소 하나. */
export interface SenseEntry {
  /** 형태소 표층형 */
  morph: string;
  /** 품사 이름. 예: `NNG` */
  tag: string;
  /** 우리말샘 어깨번호 */
  senseNo: number;
  /** 뜻풀이 */
  meaning: string;
  /**
   * 모델 점수. 후보 집합 안에서의 확률이라 합이 1 이다.
   * 형태소의 `probability` 와는 척도가 다르니 같은 임계값으로 비교하지 않는다.
   */
  probability: number;
}

/** {@link Tagger.tag} 옵션. */
export interface TagOptions {
  /**
   * 동형이의어 의미 구분(WSD) 결과를 함께 받을지. 기본 false.
   *
   * 서버에 WSD 모델이 실려 있을 때만 형태소에 sense 가 붙고, 추론이 한 번 더 돈다.
   */
  withSense?: boolean;
  /** 줄바꿈이 없어도 문장을 자동으로 나눌지. 기본 true. */
  autoSplitSentence?: boolean;
  /** 쓸 사용자 사전 이름들. 앞에 온 것이 우선한다. */
  customDictNames?: string[];
}

/**
 * 형태소 분석 결과를 다루기 쉽게 감싼 객체.
 *
 * 원본 응답이 필요하면 {@link Tagged.response} 를 본다. 이 클래스는 흔히 쓰는
 * 형태(형태소 목록, 품사 붙인 목록, 명사·동사만)를 뽑는 일만 한다.
 */
export class Tagged {
  /**
   * @param text 분석에 넣은 원문
   * @param response 서버 응답
   */
  constructor(
    readonly text: string,
    readonly response: AnalyzeSyntaxResponse,
  ) {}

  /** 분석된 문장이 하나도 없으면 true. 빈 입력에서도 호출은 성공한다. */
  get isEmpty(): boolean {
    return this.response.sentences.length === 0;
  }

  /**
   * 형태소를 문장 구분 없이 늘어놓는다.
   *
   * @returns 형태소 표층형 목록
   */
  morphs(): string[] {
    return this.collect((m) => m.text?.content ?? "");
  }

  /**
   * 형태소에 품사를 붙여 늘어놓는다.
   *
   * @returns `형태소/품사` 목록. 예: `아버지/NNG`
   */
  pos(): string[] {
    return this.collect((m) => `${m.text?.content ?? ""}/${tagName(m.tag)}`);
  }

  /**
   * 명사만 뽑는다.
   *
   * 일반명사(NNG)·고유명사(NNP)·의존명사(NNB)·대명사(NP)·수사(NR)를 명사로 본다.
   *
   * @returns 명사 목록
   */
  nouns(): string[] {
    return this.byTagPrefix("NN", "NP", "NR");
  }

  /**
   * 동사만 뽑는다. 형용사(VA)나 보조용언(VX)은 포함하지 않는다.
   *
   * @returns 동사 목록
   */
  verbs(): string[] {
    return this.byTagPrefix("VV");
  }

  /**
   * 동형이의어 의미 구분(WSD) 결과를 뽑는다.
   *
   * `withSense` 를 켜고 분석했고, 서버에 WSD 모델이 실려 있으며, 그 형태소에
   * 의미가 부여된 경우에만 값이 있다. 조사·어미처럼 의미를 갖지 않는 형태소에는
   * 원래 붙지 않으므로 대부분의 형태소는 결과에 나오지 않는다.
   *
   * @returns 의미가 부여된 형태소 목록
   */
  senses(): SenseEntry[] {
    const out: SenseEntry[] = [];
    for (const m of this.morphemes()) {
      if (!m.sense) {
        continue;
      }
      out.push({
        morph: m.text?.content ?? "",
        tag: tagName(m.tag),
        senseNo: m.sense.senseNo,
        meaning: m.sense.meaning,
        probability: m.sense.probability,
      });
    }
    return out;
  }

  /**
   * 모든 문장의 모든 어절의 모든 형태소를 순서대로 훑는다.
   *
   * 응답이 문장 → 어절 → 형태소의 3중 구조라, 뽑아 쓰는 메서드마다 같은 3중
   * 반복을 쓰는 것을 피하려고 한 곳에 모았다.
   */
  *morphemes(): Generator<Morpheme> {
    for (const s of this.response.sentences) {
      for (const t of s.tokens) {
        for (const m of t.morphemes) {
          yield m;
        }
      }
    }
  }

  private collect(fn: (m: Morpheme) => string): string[] {
    const out: string[] = [];
    for (const m of this.morphemes()) {
      out.push(fn(m));
    }
    return out;
  }

  private byTagPrefix(...prefixes: string[]): string[] {
    const out: string[] = [];
    for (const m of this.morphemes()) {
      const tag = tagName(m.tag);
      if (prefixes.some((p) => tag.startsWith(p))) {
        out.push(m.text?.content ?? "");
      }
    }
    return out;
  }
}

/**
 * 품사 열거값을 이름으로 바꾼다.
 *
 * protobuf-es 는 열거형을 숫자로 표현하므로, 사람이 읽는 이름은 여기서 되돌린다.
 * 모르는 값이면 숫자를 문자열로 돌려준다 — 서버가 태그를 추가했을 때 클라이언트가
 * 죽지 않게 하는 것이 낫다.
 *
 * @param tag 품사 열거값
 * @returns 품사 이름. 예: `NNG`
 */
export function tagName(tag: Morpheme_Tag): string {
  return Morpheme_Tag[tag] ?? String(tag);
}

/**
 * 형태소 분석을 짧게 쓰는 진입점.
 *
 * ```ts
 * const tagger = new Tagger(client);
 * const t = await tagger.tag("아버지가 방에 들어가신다.");
 * t.nouns();  // ["아버지", "방"]
 * ```
 *
 * 세밀한 옵션이 필요하면 `client.language` 로 내려가 요청을 직접 만든다.
 */
export class Tagger {
  /**
   * @param client 쓸 클라이언트
   * @param customDictNames 모든 분석에 함께 쓸 사용자 사전 이름들
   */
  constructor(
    private readonly client: BareunClient,
    private readonly customDictNames: string[] = [],
  ) {}

  /**
   * 문장을 분석한다.
   *
   * @param text 분석할 문장. 여러 문장이면 줄바꿈으로 나눠도 되고, 이어 붙여도 서버가 나눈다.
   * @param options 분석 옵션
   * @returns 분석 결과
   */
  async tag(text: string, options: TagOptions = {}): Promise<Tagged> {
    const res = await this.client.language.analyzeSyntax({
      document: doc(text),
      encodingType: JS_ENCODING,
      autoSplitSentence: options.autoSplitSentence ?? true,
      withSense: options.withSense ?? false,
      customDictNames: options.customDictNames ?? this.customDictNames,
    });
    return new Tagged(text, res);
  }

  /**
   * 형태소 표층형만 뽑는다.
   *
   * @param text 분석할 문장
   * @returns 형태소 목록
   */
  async morphs(text: string): Promise<string[]> {
    return (await this.tag(text)).morphs();
  }

  /**
   * 형태소에 품사를 붙여 뽑는다.
   *
   * @param text 분석할 문장
   * @returns `형태소/품사` 목록
   */
  async pos(text: string): Promise<string[]> {
    return (await this.tag(text)).pos();
  }

  /**
   * 명사만 뽑는다.
   *
   * @param text 분석할 문장
   * @returns 명사 목록
   */
  async nouns(text: string): Promise<string[]> {
    return (await this.tag(text)).nouns();
  }

  /**
   * 동사만 뽑는다.
   *
   * @param text 분석할 문장
   * @returns 동사 목록
   */
  async verbs(text: string): Promise<string[]> {
    return (await this.tag(text)).verbs();
  }
}

/**
 * 요청에 실을 문서를 만든다.
 *
 * 반환 타입을 `Partial<Document>` 로 쓰면 안 된다. protobuf-es v2 의 메시지는
 * `$typeName` 을 필수로 갖고, 요청 인자는 그것을 뺀 초기화 모양(MessageInit)을
 * 받는다. 필드만 담은 평범한 객체 리터럴이 그 모양이다.
 *
 * @param text 문서 내용
 * @returns 문서 초기화 값
 */
export function doc(text: string): { content: string; language: string } {
  return { content: text, language: "ko_KR" };
}
