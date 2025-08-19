export abstract class Card {
	id: number;
	deckName: string;
	initialContent: string;
	fields: Record<string, string>;
	reversed: boolean;
	initialOffset: number;
	endOffset: number;
	tags: string[];
	inserted: boolean;
	mediaNames: string[];
	mediaBase64Encoded: string[];
	oldTags: string[];
	containsCode: boolean;
	modelName: string;

	constructor(
		id: number,
		deckName: string,
		initialContent: string,
		fields: Record<string, string>,
		reversed: boolean,
		initialOffset: number,
		endOffset: number,
		tags: string[],
		inserted: boolean,
		mediaNames: string[],
		containsCode = false
	) {
		this.id = id;
		this.deckName = deckName;
		this.initialContent = initialContent;
		this.fields = fields;
		this.reversed = reversed;
		this.initialOffset = initialOffset;
		this.endOffset = endOffset;
		this.tags = tags;
		this.inserted = inserted;
		this.mediaNames = mediaNames;
		this.mediaBase64Encoded = [];
		this.oldTags = [];
		this.containsCode = containsCode;
		this.modelName = "";
	}

	abstract toString(): string;
	abstract getCard(update: boolean): object;
	abstract getMedias(): object[];
	abstract getIdFormat(): string;
}
