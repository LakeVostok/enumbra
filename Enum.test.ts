import { describe, expect, it } from "vitest";
import { Enum, BrandedEnum, type EnumValue } from "./Enum";

const A = Enum(["Value1", "Value2"]);
const B = Enum(["Value1", "Value2"]); // identical names, different enum

describe("Enum", () => {
	describe("identity semantics", () => {
		it("creates a symbol per member", () => {
			expect(typeof A.Value1).toBe("symbol");
			expect(typeof A.Value2).toBe("symbol");
		});

		it("a member equals itself but not its sibling", () => {
			expect(A.Value1).toBe(A.Value1);
			expect(A.Value1).not.toBe(A.Value2);
		});

		it("members from different enums are never equal, even with identical names", () => {
			expect(A.Value1).not.toBe(B.Value1);
			expect(A.Value1).not.toBe(B.Value2);
			expect(A.Value2).not.toBe(B.Value1);
			expect(A.Value2).not.toBe(B.Value2);
		});

		it("symbols carry the member name as description", () => {
			expect(A.Value1.description).toBe("Value1");
			expect(B.Value1.description).toBe("Value1");
		});

		it("each enum instance is isolated from the others", () => {
			const C = Enum(["Value1", "Value2"]);
			expect(C.Value1).not.toBe(A.Value1);
			expect(C.Value1).not.toBe(B.Value1);
		});
	});

	describe("reverse lookup", () => {
		it("supports enum[enum.Value]", () => {
			expect(A[A.Value1]).toBe(A.Value1);
			expect(A[A.Value2]).toBe(A.Value2);
		});

		it("reverse lookup stays within its own enum", () => {
			expect(A[B.Value1]).toBeUndefined();
			expect(B[A.Value1]).toBeUndefined();
		});
	});

	describe("property access", () => {
		it("returns undefined for unknown names", () => {
			expect(A.Unknown).toBeUndefined();
			expect(A[Symbol("Value1")]).toBeUndefined();
		});

		it("does not shadow prototype methods", () => {
			expect(typeof A.toString).toBe("function");
			expect(() => A.toString()).not.toThrow();
			expect(typeof A.hasOwnProperty).toBe("function");
			expect(typeof A.valueOf).toBe("function");
			expect(A.constructor).toBe(Object);
		});

		it("member names win over prototype names", () => {
			const Weird = Enum(["toString", "constructor"]);
			expect(typeof Weird.toString).toBe("symbol");
			expect(typeof Weird.constructor).toBe("symbol");
		});
	});

	describe("immutability", () => {
		it("throws on member assignment", () => {
			expect(() => {
				(A as Record<string, symbol>).Value1 = Symbol("hacked");
			}).toThrow(TypeError);
			expect(A.Value1.description).toBe("Value1");
		});

		it("throws on defineProperty", () => {
			expect(() => {
				Object.defineProperty(A, "Hacked", { value: 1, configurable: true });
			}).toThrow();
			expect((A as Record<string, unknown>).Hacked).toBeUndefined();
		});

		it("throws on delete", () => {
			expect(() => {
				delete (A as { Value1?: symbol }).Value1;
			}).toThrow();
			expect(A.Value1).toBe(A.Value1);
		});

		it("throws on adding new properties", () => {
			expect(() => {
				(A as Record<string, unknown>).Extra = 42;
			}).toThrow();
			expect((A as Record<string, unknown>).Extra).toBeUndefined();
		});
	});

	describe("EnumValue member type", () => {
		it("accepts enum members as function parameters", () => {
			const work = (value: EnumValue<typeof A>): symbol => value;
			expect(work(A.Value1)).toBe(A.Value1);
			expect(work(A.Value2)).toBe(A.Value2);
		});

		it("parameter values still compare correctly across enums", () => {
			const work = (value: EnumValue<typeof A>): symbol => value;
			expect(work(A.Value1)).not.toBe(B.Value1);
		});
	});

	describe("BrandedEnum", () => {
		it("is runtime-identical to Enum", () => {
			const S = BrandedEnum("Status", ["Draft", "Live"]);
			const T = BrandedEnum("Task", ["Draft", "Live"]);
			expect(S.Draft).not.toBe(T.Draft);
			expect(S[S.Draft]).toBe(S.Draft);
			expect(Object.keys(S)).toEqual(["Draft", "Live"]);
			expect(() => {
				(S as Record<string, symbol>).Draft = Symbol("hacked");
			}).toThrow(TypeError);
		});
	});

	describe("enumeration", () => {
		it("lists member names via Object.keys", () => {
			expect(Object.keys(A)).toEqual(["Value1", "Value2"]);
		});

		it("lists member names via getOwnPropertyNames", () => {
			expect(Object.getOwnPropertyNames(A)).toEqual(["Value1", "Value2"]);
		});

		it("supports the in operator", () => {
			expect("Value1" in A).toBe(true);
			expect("Value2" in A).toBe(true);
			expect("Nope" in A).toBe(false);
		});

		it("is spreadable", () => {
			const copy = { ...A };
			expect(Object.keys(copy)).toEqual(["Value1", "Value2"]);
			expect(copy.Value1).toBe(A.Value1);
		});
	});

	describe("the original problem with native enums", () => {
		it("numeric enums from different types compare equal when the check is forced", () => {
			enum NativeA {
				Value1,
			}
			enum NativeB {
				Value2,
			}
			// tsc refuses `NativeA.Value1 === NativeB.Value2` with ts2367; a cast bypasses it:
			expect((NativeA.Value1 as number) === (NativeB.Value2 as number)).toBe(true);
		});

		it("enumbra answers the same comparison correctly", () => {
			expect(A.Value1 === B.Value2).toBe(false);
		});
	});
});
