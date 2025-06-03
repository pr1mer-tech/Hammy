"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownUp, Info } from "lucide-react";
import { useWXRP } from "@/hooks/use-wxrp";
import { useAccount, useBalance } from "wagmi";
import { zeroAddress } from "viem";
import { WETH_ADDRESS } from "@/lib/constants";
import { useModal } from "connectkit";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function WrapCard() {
    const { address, isConnected } = useAccount();
    const { setOpen } = useModal();
    const [amount, setAmount] = useState("");
    const [activeTab, setActiveTab] = useState("wrap");

    const { isWrapping, isUnwrapping, wrapXRP, unwrapXRP } = useWXRP();

    // Get XRP balance
    const { data: xrpBalance } = useBalance({
        address: address,
        query: {
            enabled: !!address,
        },
    });

    // Get WXRP balance
    const { data: wxrpBalance } = useBalance({
        address: address,
        token: WETH_ADDRESS,
        query: {
            enabled: !!address,
        },
    });

    const handleWrap = async () => {
        if (!amount || Number.parseFloat(amount) <= 0) return;
        await wrapXRP(amount);
        setAmount("");
    };

    const handleUnwrap = async () => {
        if (!amount || Number.parseFloat(amount) <= 0) return;
        await unwrapXRP(amount);
        setAmount("");
    };

    const setMaxAmount = () => {
        if (activeTab === "wrap" && xrpBalance) {
            // Leave a small amount for gas fees
            const maxAmount = Math.max(0, Number(xrpBalance.formatted) - 0.01);
            setAmount(maxAmount.toString());
        } else if (activeTab === "unwrap" && wxrpBalance) {
            setAmount(wxrpBalance.formatted);
        }
    };

    const getBalance = () => {
        if (activeTab === "wrap") {
            return xrpBalance ? Number.parseFloat(xrpBalance.formatted).toFixed(4) : "0";
        } else {
            return wxrpBalance ? Number.parseFloat(wxrpBalance.formatted).toFixed(4) : "0";
        }
    };

    const getSymbol = () => {
        return activeTab === "wrap" ? "XRP" : "WXRP";
    };

    const isLoading = () => {
        return activeTab === "wrap" ? isWrapping : isUnwrapping;
    };

    const getButtonText = () => {
        if (!isConnected) return "Connect Wallet";
        if (!amount || Number.parseFloat(amount) <= 0) return "Enter amount";
        if (activeTab === "wrap") {
            return isWrapping ? "Wrapping..." : "Wrap XRP";
        } else {
            return isUnwrapping ? "Unwrapping..." : "Unwrap WXRP";
        }
    };

    const handleButtonClick = () => {
        if (!isConnected) {
            setOpen(true);
            return;
        }

        if (activeTab === "wrap") {
            handleWrap();
        } else {
            handleUnwrap();
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
            <CardHeader>
                <CardTitle className="text-center text-amber-900 flex items-center justify-center gap-2">
                    <ArrowDownUp className="h-5 w-5" />
                    Wrap / Unwrap XRP
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-800">
                        <strong>XRP ↔ WXRP Conversion</strong>
                        <br />
                        <span className="text-blue-600 text-sm">
                            Use this interface to convert between native XRP and WXRP for DeFi activities.
                        </span>
                    </AlertDescription>
                </Alert>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 bg-amber-100">
                        <TabsTrigger value="wrap" className="text-amber-800">Wrap</TabsTrigger>
                        <TabsTrigger value="unwrap" className="text-amber-800">Unwrap</TabsTrigger>
                    </TabsList>

                    <TabsContent value="wrap" className="space-y-4 mt-4">
                        <div className="text-left text-sm text-amber-700 mb-4">
                            Convert XRP to WXRP for trading
                        </div>
                    </TabsContent>

                    <TabsContent value="unwrap" className="space-y-4 mt-4">
                        <div className="text-left text-sm text-amber-700 mb-4">
                            Convert WXRP back to XRP
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-amber-800">Amount</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-amber-600">
                                Balance: {getBalance()} {getSymbol()}
                            </span>
                            <Button
                                variant="link"
                                size="sm"
                                onClick={setMaxAmount}
                                className="text-xs text-amber-700 hover:text-amber-900 p-0 h-auto"
                            >
                                MAX
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        <Input
                            type="number"
                            placeholder="0.0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pr-16 bg-white border-amber-200 focus:border-amber-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-amber-800">
                            {getSymbol()}
                        </span>
                    </div>
                </div>

                <div className="bg-amber-100 rounded-lg p-3 text-center">
                    <ArrowDownUp className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                    <div className="text-sm text-amber-700">
                        {amount ? `${amount} ${getSymbol()}` : `0 ${getSymbol()}`}
                        <br />
                        ↓
                        <br />
                        {amount ? `${amount} ${activeTab === "wrap" ? "WXRP" : "XRP"}` : `0 ${activeTab === "wrap" ? "WXRP" : "XRP"}`}
                    </div>
                </div>

                <Button
                    onClick={handleButtonClick}
                    disabled={isLoading() || (!isConnected && !amount)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                    {getButtonText()}
                </Button>

                <div className="text-xs text-amber-600 text-center space-y-1">
                    <p>• WXRP is 1:1 backed by XRP</p>
                    <p>• No fees for wrapping/unwrapping</p>
                    <p>• WXRP can be used in DeFi pools</p>
                </div>
            </CardContent>
        </Card>
    );
} 