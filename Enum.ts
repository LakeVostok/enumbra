const enumBrand = Symbol();

export type EnumResult<Names extends readonly string[]> = {
	[Key in Names[number]]: symbol & { readonly [enumBrand]?: never };
} & Record<string | symbol, symbol | undefined>;

export type EnumValue<Enum extends Record<string | symbol, symbol | undefined>> =
	NonNullable<Enum[string]> extends infer Member
		? Member extends { readonly [enumBrand]: string }
			? Member
			: symbol & { readonly [enumBrand]?: never }
		: never;

const createEnum = (names: readonly string[]): Record<string | symbol, symbol | undefined> => {
	const map = new Map<string | symbol, symbol>();
	for (const name of names) {
		const symbol = Symbol(name);
		map.set(name, symbol);
		map.set(symbol, symbol);
	}

	const proxy = new Proxy<Record<string | symbol, symbol | undefined>>(
		{},
		{
			get(target, key, receiver) {
				return map.has(key) ? map.get(key) : Reflect.get(target, key, receiver);
			},
			has(target, key) {
				return map.has(key) || Reflect.has(target, key);
			},
			ownKeys() {
				return [...new Set(names)];
			},
			getOwnPropertyDescriptor(target, key) {
				if (map.has(key)) {
					return { enumerable: true, configurable: true };
				}
				return Reflect.getOwnPropertyDescriptor(target, key);
			},
			set() {
				return false;
			},
			defineProperty() {
				return false;
			},
			deleteProperty() {
				return false;
			},
		},
	);

	return proxy;
};

export const Enum = <const Names extends readonly string[]>(
	names: Names,
): EnumResult<Names> => createEnum(names) as EnumResult<Names>;

export type BrandedEnumResult<
	Names extends readonly string[],
	Brand extends string,
> = {
	[Key in Names[number]]: symbol & { readonly [enumBrand]: Brand };
} & Record<string | symbol, (symbol & { readonly [enumBrand]: Brand }) | undefined>;

export const BrandedEnum = <
	const Names extends readonly string[],
	const Brand extends string,
>(
	name: Brand,
	names: Names,
): BrandedEnumResult<Names, Brand> => createEnum(names) as BrandedEnumResult<Names, Brand>;
