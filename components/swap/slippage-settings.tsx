"use client";

import type React from "react";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface SlippageSettingsProps {
	open: boolean;
	onOpenChangeAction: (open: boolean) => void;
	slippage: number;
	onSlippageChangeAction: (slippage: number) => void;
}

export function SlippageSettings({
	open,
	onOpenChangeAction,
	slippage,
	onSlippageChangeAction,
}: SlippageSettingsProps) {
	const [customSlippage, setCustomSlippage] = useState<string>("");
	const [isCustom, setIsCustom] = useState<boolean>(false);

	// Preset slippage values
	const presets = [0.1, 0.5, 1.0];

	// Update custom slippage when slippage changes
	useEffect(() => {
		if (!presets.includes(slippage)) {
			setCustomSlippage(slippage.toString());
			setIsCustom(true);
		} else {
			setIsCustom(false);
		}
	}, [slippage]);

	// Handle preset selection
	const handlePresetClick = (value: number) => {
		onSlippageChangeAction(value);
		setIsCustom(false);
	};

	// Handle custom slippage input
	const handleCustomSlippageChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const value = e.target.value;
		if (value === "" || /^\d*\.?\d*$/.test(value)) {
			setCustomSlippage(value);
			setIsCustom(true);
			if (value !== "" && !Number.isNaN(Number.parseFloat(value))) {
				onSlippageChangeAction(Number.parseFloat(value));
			}
		}
	};

	// Handle slider change
	const handleSliderChange = (value: number[]) => {
		if (!value[0]) return;
		onSlippageChangeAction(value[0]);
		if (!presets.includes(value[0])) {
			setCustomSlippage(value[0].toString());
			setIsCustom(true);
		} else {
			setIsCustom(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChangeAction}>
			<DialogContent className="sm:max-w-md card-gradient border-0 fade-in">
				<DialogHeader>
					<DialogTitle className="text-amber-800">
						Transaction Settings
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label className="text-amber-700">
							Slippage Tolerance
						</Label>

						<div className="flex gap-2 mb-4">
							{presets.map((preset) => (
								<Button
									key={preset}
									type="button"
									variant="outline"
									size="sm"
									className={`slippage-preset ${slippage === preset && !isCustom ? "active" : ""}`}
									onClick={() => handlePresetClick(preset)}
								>
									{preset}%
								</Button>
							))}
							<div className="relative flex-1">
								<Input
									type="text"
									value={slippage}
									onChange={handleCustomSlippageChange}
									placeholder="Custom"
									className={`pr-8 ${isCustom ? "border-amber-400 ring-1 ring-amber-400" : ""}`}
								/>
								<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-600">
									%
								</span>
							</div>
						</div>

						<div className="flex justify-between">
							<span className="text-amber-700">0.1%</span>
							<span className="text-amber-700">5%</span>
						</div>
						<Slider
							min={0.1}
							max={5}
							step={0.1}
							value={[slippage]}
							onValueChange={handleSliderChange}
						/>

						<div className="mt-4 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
							<p>
								Your transaction will revert if the price
								changes unfavorably by more than this
								percentage.
							</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
