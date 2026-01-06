const PLACEHOLDER_RULES_MARKDOWN = [
	{ pattern: /{@b ([^}]+)}/g, replacement: '**$1**' },
	{ pattern: /{@i ([^}]+)}/g, replacement: '*$1*' },

	{ pattern: /{@atk mw}/g, replacement: 'Melee Weapon Attack:' },
	{ pattern: /{@atk rw}/g, replacement: 'Ranged Weapon Attack:' },
	{ pattern: /{@atk ms}/g, replacement: 'Melee Spell Attack:' },

	{ pattern: /{@hit ([^}]+)}/g, replacement: '**+$1**' },
	{ pattern: /{@damage ([^}]+)}/g, replacement: '**$1**' },
	{ pattern: /{@dice ([^}]+)}/g, replacement: '**$1**' },
	{ pattern: /{@dc ([^}]+)}/g, replacement: '**DC $1**' },

	{ pattern: /{@(?:creature|spell|item|skill|condition|status|book|variantrule) ([^|}]+)(?:\|[^}]+)?}/g, replacement: '*$1*' },

	{ pattern: /{@h}/g, replacement: '' },
];

const PLACEHOLDER_RULES_HTML = [
	{ pattern: /{@b ([^}]+)}/g, replacement: '<strong>$1</strong>' },
	{ pattern: /{@i ([^}]+)}/g, replacement: '<em>$1</em>' },

	{ pattern: /{@atk mw}/g, replacement: 'Melee Weapon Attack:' },
	{ pattern: /{@atk rw}/g, replacement: 'Ranged Weapon Attack:' },
	{ pattern: /{@atk ms}/g, replacement: 'Melee Spell Attack:' },
	{ pattern: /{@atkr m}/g, replacement: 'Melee Attack Roll:' },

	{ pattern: /{@hit ([^}]+)}/g, replacement: '<span style="color: var(--interactive-accent); font-weight: bold;">+$1</span>' },
	{ pattern: /{@damage ([^}]+)}/g, replacement: '<span style="color: var(--text-accent);">$1</span>' },
	{ pattern: /{@dice ([^}]+)}/g, replacement: '<span style="color: var(--text-accent);">$1</span>' },
	{ pattern: /{@dc ([^}]+)}/g, replacement: '<span style="color: var(--interactive-accent); font-weight: bold;">DC $1</span>' },

	{ pattern: /{@(?:creature|spell|item|skill|condition|status|book|variantrule) ([^|}]+)(?:\|[^}]+)?}/g, replacement: '<em>$1</em>' },

	{ pattern: /{@h}/g, replacement: '' },
];

export function parseSRDText(text) {
	if (!text) return '';

	let result = text;
	for (const rule of PLACEHOLDER_RULES_MARKDOWN) {
		result = result.replace(rule.pattern, rule.replacement);
	}

	return result;
}

export function parseSRDTextHTML(text) {
	if (!text) return '';

	let result = text;
	for (const rule of PLACEHOLDER_RULES_HTML) {
		result = result.replace(rule.pattern, rule.replacement);
	}

	return result;
}
