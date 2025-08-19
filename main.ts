import { Flashcard } from "entities/flashcard";
import { Plugin } from "obsidian";

// https://regex101.com/r/BOieWh/1
const headingsRegex = /^ {0,3}(#{1,6}) +([^\n]+?) ?((?: *#\S+)*) *$/gim;

const cardRegex = /^#{5}\s+(.+)\n((?:(?!\n\s*\n).+\n?)*)/gm

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
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
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

			this.generateFlashcards(file, deckName, this.app.vault.getName(), activeFile.basename)


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

		const matches = [...file.matchAll(cardRegex)];


		console.log("headings: ", headings);

		console.log("matches: ", matches);

		return cards;
	}
}
