# enumbra

Identity-based enums for TypeScript.

`Enum(["Draft", "Review"])` creates each member as a unique symbol, so members
compare by identity instead of an underlying number or string. Comparing
members from different enums is always safe. TypeScript allows it without
casts, and different enums can never compare equal, even with identical member
names.

```bash
npm i -SE enumbra
```

```typescript
import { Enum } from "enumbra";

const Status = Enum(["Draft", "Review", "Published"]);
const Phase = Enum(["Draft", "Live"]); // same name, different enum

Status.Draft === Status.Draft; // true
Status.Draft === Status.Review; // false
Status.Draft === Phase.Draft; // false. Cross-enum comparison is always correct

Status[Status.Draft]; // Status.Draft. Reverse lookup works
Status[Phase.Draft]; // undefined. Lookup stays inside its own enum
```

## Why

Native TypeScript numeric enums are plain numbers at runtime, so members from
different enums can silently compare equal. TypeScript refuses the comparison
at compile time, so the bug is found only by accident:

```typescript
enum A { Value1 }
enum B { Value2 }

// compile error. Forced through, the runtime answer is `true` because both are 0
A.Value1 === B.Value2;
```

With string enums the runtime answer is correct only until two enums use the
same value. `"Draft" === "Draft"` is `true` no matter which enum it came from.
enumbra avoids both failure modes by construction. Members are unique symbols,
so value collisions are impossible.

## Comparison with enum packages

- `✓` means the property holds. "verified" marks claims we compiled and ran
  ourselves on 2026-11-21.
- `✗` means it does not hold. The text after it says why or what you need
  instead.
- `~` means partially, only in the limited form the text names.
- `none` means zero boilerplate or zero dependencies for that row.
- `n/a` means the column does not apply. 

| Package | Cross-enum `===` correct | Comparison type-checks, no cast | Boilerplate per enum | Distinct type per enum (nominal) | Exhaustive switch / narrowing | `values()`, `keys()`, lookup helpers | Deps | Weight / status |
|---|---|---|---|---|---|---|---|---|
| **enumbra** | ✓ verified | ✓ | none, one call | ✗ default / ✓ opt-in (`BrandedEnum`) | ✗ | partial: reverse lookup `E[E.X]`, `Object.keys(E)` | none | tiny module, this package |
| native `enum` | ✗ numeric, same index is equal; ✗ string, same value is equal | ✗, ts2367 across enums | none | ✓ | ✓, both flavors narrow; missing case is a compile error | numeric reverse map only | none | zero-cost |
| [better-enum](https://npm.im/better-enum) | ✓ verified | ✗, via common base | class + `@RegisterEnum` | ✓ | ~, `instanceof` only | `values`, `fromString`, `toString` | none | small, quiet since 2025-09 |
| [ts-jenum](https://npm.im/ts-jenum) | ✓ verified | ~, compiles when payload shapes match; ts2367 when they differ | class + `@Enum()` | ~, only when payload shapes differ | ~ | `values()`, `keys()`, `valueOf`, `find`, `filter` | none | small, quiet since 2022 |
| [ts-enums](https://npm.im/ts-enums) | ✓ verified | ~, compiles with the documented bare-class pattern; ts2367 once classes differ | 2 classes + `initEnum` | ~, only when classes add distinguishing members | ~ | `values`, `byPropName`, `byDescription` | none | small, dormant since 2017 (tarball ships ~1.8 MB TypeDoc docs) |
| [enumify](https://npm.im/enumify) | ✓, ts-enums is its port | ✓, compiles; types are structural, no base needed | class + `closeEnum()` | ✗, classes structurally identical and cross-assignable | ~ | `enumKeys`, `enumValues`, `enumValueOf()` | none | small, JS-first, quiet since 2020 |
| [enum-plus](https://npm.im/enum-plus) | ✗, members are raw numbers and strings | compiles, but value-based. Same value means equal | none, one call | ✗ | ✓, literal member types narrow (modern resolution) | rich: `labels`, `items`, `findBy`, `toList`, i18n | none | ~3 KB gz, very active |
| [ts-enum-util](https://npm.im/ts-enum-util) | ✗, utilities over native enums, `===` unchanged | n/a | n/a | n/a | ✓ exhaustive `$enum.visitValue` | rich: `getKeys`, `getValues`, key/value lookups | none | maintained, 2024 |
| [zenum](https://npm.im/zenum) | ✓ verified, `[type, data]` tuples; fresh per call — even same-enum `===` is false | ✗, ts2367 across different-shaped type maps; identical maps compile | one call + type map, `zenum<{...}>()` | ~, identical type maps are interchangeable | ✓ verified, `match` rejects missing cases | rich: `match`, `type`, `data`, `is`, `semantic` | imports zod, undeclared — clean install crashes | small, quiet since 2022 |
| [superenum](https://npm.im/superenum) | ✓ verified, `[type, data]` tuples; fresh per call — even same-enum `===` is false | ~, compiles only when member names match | one call + type map, `Enum<{...}>()` | ~, same-shape type maps are the same type | ✓ verified, `match` rejects missing cases | rich: `match`, `type`, `data`, `item`, `create` | 5 deps, all misdeclared tooling | tiny module, bloated install, quiet since 2023 |

### What the columns mean

- **Cross-enum `===` correct.** `A.Value1 === B.Value2` returns the
  semantically right answer at runtime: `false` for different enums, even with
  identical names. Native numeric enums return `true`, because both members
  are `0` at runtime. String enums fail as soon as two enums share a value.
  Raw-value libraries inherit both problems. Identity-based libraries return
  `false` because members compare by identity.
- **Comparison type-checks, no cast.** `A.Value1 === B.Value2` compiles as
  written, without `as unknown as` casts or helper functions. TypeScript
  rejects comparisons between types with no overlap (error ts2367). Native
  enums trigger it, and so does better-enum's documented pattern (distinct
  instance state per class). The unbranded class-based libraries (ts-jenum,
  ts-enums, enumify) have purely structural types, so identically-shaped
  enums compare without a cast — which is also why their nominal column is
  partial. zenum and superenum reject across differently-shaped type maps.
  enumbra members are all `symbol`, so the comparison compiles.
- **Boilerplate per enum.** Code cost of declaring one enum: a single call for
  enumbra, enum-plus, and native, versus class definitions, constructors, and
  registration rituals (`@RegisterEnum`, `initEnum()`, `closeEnum()`).
- **Distinct type per enum (nominal).** Whether each enum is its own type, so a
  function can demand a member of one specific enum and reject members of
  other enums at compile time:

  ```typescript
  // better-enum / native enum: any other enum is a compile error.
  // ts-jenum / ts-enums: error only when the classes differ in members or
  // payload shape; identically-shaped enums are interchangeable.
  // enumify: never an error; the classes are cross-assignable.
  function paint(color: Color) {}
  paint(Size.SMALL); // compile error (better-enum / native)

  // enumbra (default): every member everywhere is `symbol`
  function paint(color: EnumValue<typeof Color>) {}
  paint(anyOldSymbol); // compiles. The type system cannot separate enums

  // enumbra (BrandedEnum): separation is back, but Color.RED === Other.RED
  // needs a `symbol` cast
  ```

  This is the deliberate trade for the previous column. `E1.A === E2.B` can
  only compile if both sides share a type (`symbol`), which rules out per-enum
  types. You get safe cross-enum comparison or per-enum types, not both. The
  structural class-based libraries land on the same trade from the other
  side: their comparison compiles precisely because their types are not
  distinct. enumbra lets you pick per enum: `Enum` for cast-free comparison,
  `BrandedEnum` for nominal typing.
- **Exhaustive switch / narrowing.** Compiler-checked `switch` over members,
  where a missing case is a compile error, plus type narrowing inside each
  branch. Native enums get this (both flavors: a missing case fails with
  ts2366 under a declared return type), as do literal-union-style types —
  including enum-plus members under modern module resolution — and
  ts-enum-util's `$enum.visitValue`. enumbra's `symbol` members switch fine at
  runtime but get no exhaustiveness checking. Class-based libraries offer
  `instanceof` narrowing at best.
- **values, keys, lookup helpers.** Runtime utilities for introspection:
  listing members, reverse lookup by name or description, iteration, metadata.
  enumbra covers reverse lookup (`E[E.X]`) and `Object.keys(E)`. enum-plus
  goes furthest, with labels, i18n, and UI bindings. The table uses "partial"
  and "rich" for this range.
- **Deps.** Runtime npm dependencies installed alongside the package. All rows
  declare zero — except zenum, which imports zod without declaring it, so a
  clean install of zenum crashes. TypeScript ≥ 5.0 is a `peerDependency`. It
  uses your compiler and ships no code.
- **Weight / status.** Rough footprint and maintenance state. Dates show the
  last publish we checked on 2026-11-22.

Also on the first page of [npm search "enum"](https://www.npmjs.com/search?q=enum):
value/key extractors for native enums (`enum`, `enum-for`, `@kejistan/enum`,
`typescript-enum`, `enum-values`, `typescript-string-enums`) and domain packs
(`ts-key-enum`, `pg-error-enum`, `http-method-enum`). These are utilities or
constants, and none of them changes comparison semantics.

The pattern in the table is that the identity-based libraries (enumbra,
better-enum, ts-jenum, ts-enums, enumify, zenum, superenum) get cross-enum
comparison right because members are objects, symbols, or tuples compared by
identity. Who pays for the compile-time check divides them. better-enum's
documented pattern (distinct instance state) makes the comparison a ts2367
error, like native. zenum and superenum reject across differently-shaped type
maps; superenum compiles only when both tuples have the same shape. ts-jenum,
ts-enums, and enumify let the comparison compile — their types are structural,
so identically-shaped enums are interchangeable at compile time, which is
exactly why their nominal column is partial. enumbra type-checks the
comparison and returns the correct answer for every pair of enums, not just
identically-shaped ones. The cost is per-enum nominal types: all members are
`symbol`, so there is no exhaustiveness checking. `BrandedEnum` restores
nominal typing per enum, at the cost of casting cross-enum comparisons.

We confirmed behavior claims marked "verified" on 2026-11-21 by compiling and
running each library with tsc and node. On 2026-11-22 we re-audited every row
against the published source of each package (npm tarballs and source repos),
reproducing the behavioral claims with probes compiled under tsc 7 and 5.x and
run with node; the table above reflects that pass. API details come from each
package's README.

## Examples from the ecosystem

**ts-enums.** Java-like and identity-based. Comparison is correct, but you
compare through a common base type:

```typescript
import { Enum, EnumValue } from "ts-enums";

class Color extends EnumValue {}
class ColorEnum extends Enum<Color> {
  RED: Color = new Color("RED");
  constructor() { super(); this.initEnum("Color"); }
}
const Colors = new ColorEnum();

Colors.RED === Colors.RED; // true
// Colors.RED === OtherEnum.RED is a compile error; compare via the EnumValue base type
```

**better-enum.** Extensible class-based instances:

```typescript
import BetterEnum, { RegisterEnum } from "better-enum";

@RegisterEnum
class Status extends BetterEnum {
  static LOADING = new Status(true);
  static READY = new Status(false);
  constructor(public blocked: boolean) { super(); }
}
```

**ts-jenum.** Java-like, with code and text fields and reverse lookups:

```typescript
import { Enum, EnumType } from "ts-jenum";

@Enum("text")
class State extends EnumType<State>() {
  static readonly NEW = new State(1, "New");
  private constructor(readonly code: number, readonly text: string) { super(); }
}

State.valueOf("New"); // State.NEW
```

**enumify.** The original class-based enum pattern:

```typescript
import { Enumify } from "enumify";

class Color extends Enumify {
  static red = new Color();
  static blue = new Color();
  static _ = this.closeEnum();
}

Color.enumValues; // [Color.red, Color.blue]
```

**enum-plus.** Rich business dictionary, but members are raw values, so the
cross-enum collision problem remains:

```typescript
import { Enum } from "enum-plus";

const Status = Enum({
  Draft: { value: 1, label: "Draft", color: "default" },
});

Status.Draft; // 1, a plain number
```

**ts-enum-util.** Type-safe helpers around native enums. Comparison semantics
are unchanged:

```typescript
import { $enum } from "ts-enum-util";

$enum(NativeStatus).getValues(); // typed utilities
$enum.visitValue(value).with({ /* exhaustive handlers */ });
```

## API

```typescript
Enum<Names extends readonly string[]>(names: Names): EnumResult<Names>
BrandedEnum<Names, Brand>(name: Brand, names: Names): BrandedEnumResult<Names, Brand>
EnumValue<Enum> // the member type
```

- `EnumValue<typeof E>`, the type of an enum member, is what function
  parameters use: `const work = (v: EnumValue<typeof Status>) => {}`. For an
  unbranded `Enum`, any symbol type-checks. A `BrandedEnum` member is
  rejected. Brands never cross flavors; see the trade above. Runtime identity
  still separates enums. The shorthand `typeof E.Member`, for example
  `typeof Status.Draft`, is the exact same type and needs no import. Writing
  `Status.type` is a grammar error in TypeScript. A value cannot be referenced
  in type position, whatever fields its type has, and that is why a helper
  like `EnumValue` exists.
- `E.Member` is a `symbol`, unique per enum. Its `.description` is the member
  name.
- `E[E.Member]` is reverse lookup, in native-enum style.
- `E.Unknown` is `undefined` at runtime, typed as `symbol | undefined`.
- The enum is immutable. Assignment, `Object.defineProperty`, and `delete`
  throw.
- The enum is enumerable: `Object.keys(E)`, `"Member" in E`, and object
  spread all work.
- Cross-enum `E1.A === E2.B` compiles without casts. It is always `false` at
  runtime.
- Call sites need no `as const`. The `const` modifier on the type parameter,
  a TypeScript 5.0 feature, infers literal member names.

### Idiom: `type A = EnumValue<typeof A>` for native-enum ergonomics

Native enums double as a type, `work(v: A)`, because `enum` is a syntax-level
declaration that creates both a value and a type. A library function cannot
create a type-space name. You can, in one line, because value space and type
space are separate and the same name is legal:

```typescript
const A = Enum(["Value1", "Value2"]);
type A = EnumValue<typeof A>; // `A` now works in both spaces

const work = (param: A) => {};
work(A.Value1); // ✓
// work(A) is a compile error. The enum object is not a member
```

`typeof A` itself cannot be used for this. It is the type of the enum object,
and a member, a symbol, can never be assignable to it.

### Per-enum types: `BrandedEnum`

`BrandedEnum(name, names)` is `Enum` plus a compile-time-only brand. Members
stay unique symbols at runtime, but the type system can tell two branded
enums apart.

```typescript
const Status = BrandedEnum("Status", ["Draft", "Live"]);
const Task = BrandedEnum("Task", ["Draft", "Live"]);

const work = (value: EnumValue<typeof Status>) => {};
work(Status.Draft); // ✓
// work(Task.Draft) does not compile. Task.Draft belongs to a different enum
// work(Symbol()) does not compile. It is not a Status member
```

The trade flips for branded enums. `Status.Draft === Task.Draft` no longer
compiles; cast one side to `symbol` to compare. This is the same ts2367 error
the class-based libraries produce. Brands never cross flavors. Comparing a
branded member against an unbranded one, or passing it where an unbranded
member is expected, is a compile error too. Cast to `symbol` to mix.

## Caveats

- Members are typed `symbol`, so there are no per-enum nominal types, no
  exhaustiveness-checked `switch`, and no narrowing. `EnumValue<typeof E>`
  accepts members of any unbranded enum and any plain symbol, but never a
  branded member. This is the deliberate trade for allowing cross-enum
  comparison. `BrandedEnum` restores per-enum types per enum, at the cost of
  casting cross-enum comparisons.
- Symbols do not survive `JSON.stringify`. Serialize `member.description` and
  match against it when rebuilding.
- Requires TypeScript ≥ 5.0. `Enum` declares its type parameter with the
  `const` modifier, a TS 5.0 feature, which infers literal member names
  without `as const`. It is declared as a `peerDependency`.
