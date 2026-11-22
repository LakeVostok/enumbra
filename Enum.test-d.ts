import { describe, expectTypeOf, it } from "vitest";
import { BrandedEnum, Enum, type EnumResult, type EnumValue } from "./Enum";

const A = Enum(["Value1", "Value2"]);
const B = Enum(["Value1", "Value2"]);
const S = BrandedEnum("Status", ["Draft", "Live"]);
const T = BrandedEnum("Task", ["Draft", "Live"]);

describe("Enum compile-time types", () => {
	it("members carry the unbranded marker and differ from branded members", () => {
		expectTypeOf(A.Value1).toEqualTypeOf<EnumValue<typeof A>>();
		expectTypeOf(A.Value1).not.toExtend<EnumValue<typeof S>>();
	});

	it("infers the literal tuple without as const", () => {
		expectTypeOf(A).toEqualTypeOf<EnumResult<readonly ["Value1", "Value2"]>>();
	});

	it("still accepts an explicit as const", () => {
		const C = Enum(["X", "Y"] as const);
		expectTypeOf(C).toEqualTypeOf<EnumResult<readonly ["X", "Y"]>>();
	});

	it("falls back to string keys for a pre-typed string array", () => {
		const names: string[] = ["X", "Y"];
		const D = Enum(names);
		expectTypeOf(D).toEqualTypeOf<EnumResult<string[]>>();
	});

	it("arbitrary access is symbol | undefined", () => {
		expectTypeOf(A.Unknown).toEqualTypeOf<symbol | undefined>();
		expectTypeOf(A[Symbol("whatever")]).toEqualTypeOf<symbol | undefined>();
	});

	it("reverse lookup is symbol | undefined", () => {
		expectTypeOf(A[A.Value1]).toEqualTypeOf<symbol | undefined>();
	});

	it("cross-enum comparison compiles and yields boolean", () => {
		// same names, different enums: compiles because unbranded members share a type
		expectTypeOf(A.Value1 === B.Value1).toEqualTypeOf<boolean>();
	});

	it("same-enum comparison yields boolean", () => {
		expectTypeOf(A.Value1 === A.Value2).toEqualTypeOf<boolean>();
	});

	it("EnumValue resolves to the unbranded marker, shared across unbranded enums", () => {
		expectTypeOf<EnumValue<typeof A>>().not.toEqualTypeOf<symbol>();
		expectTypeOf<EnumValue<typeof B>>().toEqualTypeOf<EnumValue<typeof A>>();
	});

	it("EnumValue accepts any symbol, the documented trade", () => {
		expectTypeOf(B.Value1).toExtend<EnumValue<typeof A>>();
		expectTypeOf(Symbol("x")).toExtend<EnumValue<typeof A>>();
	});

	it("EnumValue rejects non-symbols", () => {
		expectTypeOf("Value1").not.toExtend<EnumValue<typeof A>>();
		expectTypeOf(42).not.toExtend<EnumValue<typeof A>>();
		expectTypeOf(undefined).not.toExtend<EnumValue<typeof A>>();
	});

	it("BrandedEnum: EnumValue extracts the branded member type", () => {
		expectTypeOf<EnumValue<typeof S>>().not.toEqualTypeOf<symbol>();
		expectTypeOf<EnumValue<typeof S>>().not.toEqualTypeOf<EnumValue<typeof T>>();
		expectTypeOf(S.Draft).toEqualTypeOf<EnumValue<typeof S>>();
	});

	it("branded members as parameters accept their own enum, reject everything else", () => {
		const work = (value: EnumValue<typeof S>) => value;
		work(S.Draft);
		work(S.Live);
		// @ts-expect-error member of a different branded enum
		work(T.Draft);
		// @ts-expect-error plain symbol
		work(Symbol("Draft"));
		// @ts-expect-error member of an unbranded enum
		work(A.Value1);
	});

	it("BrandedEnum: cross-enum === errors, a symbol cast makes it compile", () => {
		// @ts-expect-error branded enums have no overlap
		S.Draft === T.Draft;
		// @ts-expect-error branded and unbranded members have no overlap
		S.Draft === A.Value1;
		expectTypeOf(S.Draft === (T.Draft as symbol)).toEqualTypeOf<boolean>();
		expectTypeOf(S.Draft === (A.Value1 as symbol)).toEqualTypeOf<boolean>();
		expectTypeOf(S.Draft === S.Live).toEqualTypeOf<boolean>();
	});

	it("BrandedEnum: lookups type as branded member | undefined", () => {
		expectTypeOf(S.Unknown).toEqualTypeOf<EnumValue<typeof S> | undefined>();
		expectTypeOf(S[S.Draft]).toEqualTypeOf<EnumValue<typeof S> | undefined>();
	});

	it("typeof E.Member is the same type as EnumValue<typeof E>", () => {
		expectTypeOf<typeof A.Value1>().toEqualTypeOf<EnumValue<typeof A>>();
		expectTypeOf<typeof S.Draft>().toEqualTypeOf<EnumValue<typeof S>>();
		expectTypeOf<typeof S.Draft>().not.toEqualTypeOf<typeof A.Value1>();
	});

	it("unbranded typeof E.Member works as a parameter type", () => {
		const work = (param: typeof A.Value1) => param;
		work(A.Value1);
		work(A.Value2); // same enum, also unbranded
		work(B.Value1); // documented trade: any unbranded member accepted
		// @ts-expect-error branded members are not accepted in unbranded contexts
		work(S.Draft);
	});

	it("idiom: type E = EnumValue<typeof E> names the object and the member type", () => {
		const C = Enum(["X", "Y"]);
		type C = EnumValue<typeof C>;
		expectTypeOf<C>().toEqualTypeOf<typeof C.X>();
		const work = (param: C) => param;
		expectTypeOf(work(C.X)).toEqualTypeOf<C>();
		work(C.Y);
		// @ts-expect-error the enum object itself is not a member
		work(C);
	});

	it("members are not assignable to unrelated types", () => {
		expectTypeOf(A.Value1).not.toBeString();
		expectTypeOf(A.Value1).not.toBeNumber();
	});
});

describe("reported reproductions", () => {
	it("native enums: cross-enum comparison is a compile error", () => {
		enum NativeA {
			Value1,
		}
		enum NativeB {
			Value2,
		}
		// @ts-expect-error ts2367, native enums have no overlap across types;
		// a cast bypasses it and the expression is `true` at runtime, see Enum.test.ts
		NativeA.Value1 === NativeB.Value2;
	});

	it("typeof E is the enum object, a member is rejected", () => {
		const work = (value: typeof A) => value;
		// @ts-expect-error a member is a symbol, not the enum object; the parameter type is EnumValue<typeof E>
		work(A.Value1);
	});
});
