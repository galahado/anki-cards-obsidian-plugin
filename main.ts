import { Card } from "entities/card";
import { Flashcard } from "entities/flashcard";
import { Notice, Plugin } from "obsidian";

// https://regex101.com/r/BOieWh/1
const headingsRegex = /^ {0,3}(#{1,6}) +([^\n]+?) ?((?: *#\S+)*) *$/gim;

const cardRegex5 = /^#{5}\s+(.+)\n((?:(?!\n\s*\n).+\n?)*)/gm;

const cardRegex6 = /^#{6}\s+(.+)\n((?:(?!\n\s*\n).+\n?)*)/gm;

let notifications = [];

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "anki-sync-mine",
			name: "anki generate",
			callback: () => {
				this.generate();
			},
		});
	}

	private async generate() {
		const activeFile = this.app.workspace.getActiveFile();

		if (activeFile && activeFile.parent && activeFile.parent.path != "/") {
			try {
				await this.ping();
			} catch (err) {
				console.error(err);
			}

			let deckName = activeFile.parent.path
				.split("/")
				.slice(0, 2)
				.join("::");
			await this.createDeck(deckName);

			let file = await this.app.vault.read(activeFile);
			if (!file.endsWith("\n")) {
				file += "\n";
			}

			const cards = this.generateFlashcards(
				file,
				deckName,
				this.app.vault.getName(),
				activeFile.basename
			);

			this.insertCardsOnAnki(cards, deckName);

		}
	}

	private invoke(action: string, version = 6, params = {}): any {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.addEventListener("error", () =>
				reject("failed to issue request")
			);
			xhr.addEventListener("load", () => {
				try {
					const response = JSON.parse(xhr.responseText);
					if (Object.getOwnPropertyNames(response).length != 2) {
						throw "response has an unexpected number of fields";
					}
					if (
						!Object.prototype.hasOwnProperty.call(response, "error")
					) {
						throw "response is missing required error field";
					}
					if (
						!Object.prototype.hasOwnProperty.call(
							response,
							"result"
						)
					) {
						throw "response is missing required result field";
					}
					if (response.error) {
						throw response.error;
					}
					resolve(response.result);
				} catch (e) {
					reject(e);
				}
			});

			xhr.open("POST", "http://127.0.0.1:8765");
			xhr.send(JSON.stringify({ action, version, params }));
		});
	}

	public async ping(): Promise<boolean> {
		return (await this.invoke("version", 6)) === 6;
	}

	public async createDeck(deckName: string): Promise<any> {
		return this.invoke("createDeck", 6, { deck: deckName });
	}

	public generateFlashcards(
		file: string,
		deck: string,
		vault: string,
		note: string,
		globalTags: string[] = []
	): Flashcard[] {
		let cards: Flashcard[] = [];
		let headings: any = [];

		// https://regex101.com/r/agSp9X/4
		headings = [...file.matchAll(headingsRegex)];

		const noteLink = this.substituteObsidianLinks(`[[${note}]]`, vault);

		let matches = [...file.matchAll(cardRegex5)];

		for (const match of matches) {
			const headingLevel = 5;

			let index = 0;
			if (match.index) index = match.index - 1;

			const context = this.getContext(
				headings,
				index,
				headingLevel
			).concat([]);
			const id = -1;
			const endingLine = index + 1 + match[0].length;
			const originalQuestion = match[1].trim();
			let question = [...context, originalQuestion].join(" > ");
			let answer = match[2].trim().replace(/\n/g, "<br/>");
			const inserted = false;
			const reversed = true;
			const tags = [deck.concat("::").concat(note)];
			const fields: any = {
				Front: question,
				Back: answer,
				Context: noteLink,
			};
			const containsCode = false;

			const card = new Flashcard(
				id,
				deck,
				originalQuestion,
				fields,
				reversed,
				0,
				endingLine,
				tags,
				inserted,
				[],
				containsCode
			);
			cards.push(card);
		}

		matches = [...file.matchAll(cardRegex6)];

		for (const match of matches) {
			const headingLevel = 6;

			let index = 0;
			if (match.index) index = match.index - 1;

			const context = this.getContext(
				headings,
				index,
				headingLevel
			).concat([]);
			const id = -1;
			const endingLine = index + 1 + match[0].length;
			const originalQuestion = match[1].trim();
			let question = [...context, originalQuestion].join(" > ");
			let answer = match[2].trim();
			const inserted = false;
			const reversed = false;
			const tags = [deck.concat("::").concat(note)];
			const fields: any = {
				Front: question,
				Back: answer,
				Context: noteLink,
			};
			const containsCode = false;

			const card = new Flashcard(
				id,
				deck,
				originalQuestion,
				fields,
				reversed,
				0,
				endingLine,
				tags,
				inserted,
				[],
				containsCode
			);
			cards.push(card);
		}

		return cards;
	}

	private substituteObsidianLinks(str: string, vaultName: string) {
		const linkRegex = /\[\[(.+?)(?:\|(.+?))?\]\]/gim;
		vaultName = encodeURIComponent(vaultName);

		return str.replace(linkRegex, (match, filename, rename) => {
			const href = `obsidian://open?vault=${vaultName}&file=${encodeURIComponent(
				filename
			)}.md`;
			const fileRename = rename ? rename : filename;
			return `<a href="${href}">${fileRename}</a>`;
		});
	}

	private getContext(
		headings: any,
		index: number,
		headingLevel: number
	): string[] {
		const context: string[] = [];
		let currentIndex: number = index;
		let goalLevel = 6;

		let i = headings.length - 1;
		// Get the level of the first heading before the index (i.e. above the current line)
		if (headingLevel !== -1) {
			// This is the case of a #flashcard in a heading
			goalLevel = headingLevel - 1;
		} else {
			// Find first heading and its level
			// This is the case of a #flashcard in a paragraph
			for (i; i >= 0; i--) {
				if (headings[i].index < currentIndex) {
					currentIndex = headings[i].index;
					goalLevel = headings[i][1].length - 1;

					context.unshift(headings[i][2].trim());
					break;
				}
			}
		}

		// Search for the other headings
		for (i; i >= 0; i--) {
			const currentLevel = headings[i][1].length;
			if (currentLevel <= goalLevel && headings[i].index < currentIndex) {
				currentIndex = headings[i].index;
				goalLevel = currentLevel - 1;

				context.unshift(headings[i][2].trim());
			}
		}

		return context;
	}

	private async insertCardsOnAnki(
		cardsToCreate: Card[],
		deckName: string
	): Promise<number> {
		let insertedCards = 0;
		if (cardsToCreate.length) {
			try {
				await this.addCards(cardsToCreate);

				let total = 0;

				cardsToCreate.forEach((card) => {
					if (card.id === null) {
						new Notice(
							`Error, could not add: '${card.initialContent}'`,
							5 * 1000
						);
					} else {
						card.reversed ? (insertedCards += 2) : insertedCards++;
					}
					card.reversed ? (total += 2) : total++;
				});

				notifications.push(
					`Inserted successfully ${insertedCards}/${total} cards.`
				);
			} catch (err) {
				console.error(err);
				Error("Error: Could not write cards on Anki");
			}
		}
		return insertedCards;
	}

	public async addCards(cards: Card[]): Promise<number[]> {
		const ids: any = [];

		console.log("cards: ", cards)

		cards.forEach((card) => {
			const id = this.invoke("addNote", 6, { note: card });
			ids.push(id);
		});

		return ids;
	}
}
