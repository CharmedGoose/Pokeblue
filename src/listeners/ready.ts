import { Listener } from "@sapphire/framework";

export class ReadyListener extends Listener {
	public constructor(
		context: Listener.LoaderContext,
		options: Listener.Options,
	) {
		super(context, {
			...options,
			once: true,
			event: "ready",
		});
	}
	public run() {
		this.container.logger.info(
			String.raw` ____       _        _     _            
|  _ \ ___ | | _____| |__ | |_   _  ___ 
| |_) / _ \| |/ / _ \ '_ \| | | | |/ _ \
|  __/ (_) |   <  __/ |_) | | |_| |  __/
|_|   \___/|_|\_\___|_.__/|_|\__,_|\___| ${this.container.debug? "DEBUG MODE" : ""}
`,
		);
		this.container.logger.debug("hai!");
	}
}
