import { Listener } from "@sapphire/framework";

export class ReadyListener extends Listener {
	public constructor(context: Listener.LoaderContext, options: Listener.Options) {
		super(context, {
			...options,
			once: true,
			event: "ready",
		});
	}

	public async run() {
		this.container.logger.info(String.raw` ____       _        _     _             `);
		this.container.logger.info(String.raw`|  _ \ ___ | | _____| |__ | |_   _  ___  `);
		this.container.logger.info(String.raw`| |_) / _ \| |/ / _ \ '_ \| | | | |/ _ \ `);
		this.container.logger.info(String.raw`|  __/ (_) |   <  __/ |_) | | |_| |  __/ `);
		this.container.logger.info(String.raw`|_|   \___/|_|\_\___|_.__/|_|\__,_|\___| ${process.env.NODE_ENV === "production" ? "Production" : "Development"}`); // prettier-ignore
		this.container.logger.info();
	}
}