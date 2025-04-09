import {
	DocumentIcon,
	GithubIcon,
	MessageIcon,
	QuestionIcon,
	TelegramIcon,
	TwitterXIcon,
} from "../ui/icons";

export function Footer() {
	return (
		<footer className="w-full bg-gray-900 py-16 px-4 mt-16">
			<div className="max-w-4xl mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-10">
					<div className="flex flex-col">
						<h3 className="text-xl font-semibold mb-4 text-white">
							Hammy Swap
						</h3>
						<p className="text-gray-400 text-sm">
							The pioneer decentralized exchange on the XRPL EVM Sidechain.
						</p>
					</div>

					<div className="flex flex-col">
						<h3 className="text-lg font-semibold mb-4 text-white">
							Resources
						</h3>
						<ul className="space-y-2">
							<li>
								<a
									href="#"
									className="text-gray-400 hover:text-amber-500 text-sm flex items-center"
								>
									<DocumentIcon className="h-4 w-4 mr-2" />
									Documentation
								</a>
							</li>
							<li>
								<a
									href="#"
									className="text-gray-400 hover:text-amber-500 text-sm flex items-center"
								>
									<QuestionIcon className="h-4 w-4 mr-2" />
									FAQs
								</a>
							</li>
							<li>
								<a
									href="#"
									className="text-gray-400 hover:text-amber-500 text-sm flex items-center"
								>
									<MessageIcon className="h-4 w-4 mr-2" />
									Support
								</a>
							</li>
						</ul>
					</div>

					<div className="flex flex-col">
						<h3 className="text-lg font-semibold mb-4 text-white">
							Protocol
						</h3>
						<ul className="space-y-2">
							<li>
								<a
									href="#"
									className="text-gray-400 hover:text-amber-500 text-sm"
								>
									Governance
								</a>
							</li>
							<li>
								<a
									href="#"
									className="text-gray-400 hover:text-amber-500 text-sm"
								>
									Security
								</a>
							</li>
							<li>
								<a
									href="#"
									className="text-gray-400 hover:text-amber-500 text-sm"
								>
									Tokenomics
								</a>
							</li>
						</ul>
					</div>

					<div className="flex flex-col">
						<h3 className="text-lg font-semibold mb-4 text-white">
							Social Media
						</h3>
						<div className="flex space-x-4">
							<a
								href="https://github.com/pr1mer-tech/Hammy"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-amber-500"
							>
								<GithubIcon className="h-6 w-6" />
							</a>
							<a
								href="https://x.com/HammySwap"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-amber-500"
							>
								<TwitterXIcon className="h-6 w-6" />
							</a>
							<a
								href="https://t.me"
								target="_blank"
								rel="noopener noreferrer"
								className="text-gray-400 hover:text-amber-500"
							>
								<TelegramIcon className="h-6 w-6" />
							</a>
						</div>
					</div>
				</div>

				<div className="border-t border-gray-700 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
					<p className="text-gray-400 text-sm mb-4 md:mb-0">
						© {new Date().getFullYear()} Hammy Swap. All rights reserved.
					</p>
					<div className="flex space-x-6">
						<a
							href="#"
							className="text-gray-400 hover:text-amber-500 text-sm"
						>
							Terms of Service
						</a>
						<a
							href="#"
							className="text-gray-400 hover:text-amber-500 text-sm"
						>
							Privacy Policy
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
