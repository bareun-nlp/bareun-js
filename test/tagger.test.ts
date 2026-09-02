import { describe, expect, it } from "vitest";
import { create } from "@bufbuild/protobuf";

import {
  AnalyzeSyntaxResponseSchema,
  Morpheme_Tag,
  type AnalyzeSyntaxResponse,
} from "../src/gen/bareun/language_service_pb.js";
import { Tagged, tagName } from "../src/tagger.js";

/**
 * 형태소 하나를 만든다.
 *
 * @param content 표층형
 * @param tag 품사
 */
function morph(content: string, tag: Morpheme_Tag) {
  return { text: { content }, tag };
}

/**
 * 형태소 목록 하나를 담은 응답을 만든다.
 *
 * @param morphemes 형태소들
 */
function response(morphemes: ReturnType<typeof morph>[]): AnalyzeSyntaxResponse {
  return create(AnalyzeSyntaxResponseSchema, {
    language: "ko_KR",
    sentences: [{ tokens: [{ morphemes }] }],
  });
}

const sample = new Tagged(
  "아버지가 들어가신다",
  response([
    morph("아버지", Morpheme_Tag.NNG),
    morph("가", Morpheme_Tag.JKS),
    morph("들어가", Morpheme_Tag.VV),
    morph("시", Morpheme_Tag.EP),
  ]),
);

describe("Tagged", () => {
  it("형태소를 문장 구분 없이 늘어놓는다", () => {
    expect(sample.morphs()).toEqual(["아버지", "가", "들어가", "시"]);
  });

  it("품사를 붙인다", () => {
    expect(sample.pos()).toEqual(["아버지/NNG", "가/JKS", "들어가/VV", "시/EP"]);
  });

  it("명사만 뽑는다", () => {
    expect(sample.nouns()).toEqual(["아버지"]);
  });

  it("동사만 뽑는다", () => {
    expect(sample.verbs()).toEqual(["들어가"]);
  });

  it("대명사와 수사와 의존명사도 명사로 센다", () => {
    const t = new Tagged("", response([
      morph("나", Morpheme_Tag.NP),
      morph("하나", Morpheme_Tag.NR),
      morph("것", Morpheme_Tag.NNB),
      morph("는", Morpheme_Tag.JX),
    ]));
    expect(t.nouns()).toEqual(["나", "하나", "것"]);
  });

  it("형용사와 보조용언은 동사에 넣지 않는다", () => {
    const t = new Tagged("", response([
      morph("예쁘", Morpheme_Tag.VA),
      morph("있", Morpheme_Tag.VX),
    ]));
    expect(t.verbs()).toEqual([]);
  });

  it("sense 가 붙은 형태소만 뽑는다", () => {
    const res = create(AnalyzeSyntaxResponseSchema, {
      sentences: [{
        tokens: [{
          morphemes: [
            morph("나", Morpheme_Tag.NP),
            {
              text: { content: "밤" },
              tag: Morpheme_Tag.NNG,
              sense: { senseNo: 2, meaning: "밤나무의 열매.", probability: 0.55 },
            },
          ],
        }],
      }],
    });
    const senses = new Tagged("", res).senses();
    expect(senses).toHaveLength(1);
    expect(senses[0]).toMatchObject({ morph: "밤", tag: "NNG", senseNo: 2 });
  });

  it("with_sense 를 켜지 않으면 sense 가 비어 있다", () => {
    expect(sample.senses()).toEqual([]);
  });

  it("빈 결과를 구분한다", () => {
    const empty = new Tagged("", create(AnalyzeSyntaxResponseSchema, {}));
    expect(empty.isEmpty).toBe(true);
    expect(empty.morphs()).toEqual([]);
    expect(sample.isEmpty).toBe(false);
  });

  it("원문과 응답을 그대로 들고 있다", () => {
    expect(sample.text).toBe("아버지가 들어가신다");
    expect(sample.response.language).toBe("ko_KR");
  });
});

describe("tagName", () => {
  it("열거값을 이름으로 바꾼다", () => {
    expect(tagName(Morpheme_Tag.NNG)).toBe("NNG");
    expect(tagName(Morpheme_Tag.VV)).toBe("VV");
  });

  it("모르는 값은 숫자를 문자열로 돌려준다", () => {
    // 서버가 태그를 추가했을 때 클라이언트가 죽지 않아야 한다.
    expect(tagName(9999 as Morpheme_Tag)).toBe("9999");
  });
});
