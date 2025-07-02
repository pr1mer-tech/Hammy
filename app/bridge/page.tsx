import { Skeleton } from "@/components/ui/skeleton";
import { BridgeComponent } from "./widget";
import { Suspense } from "react";
import { PoweredBySquid } from "./PoweredSquid";

export const metadata = {
  title: "Hammy Bridge",
  description:
    "Bridge your assets across chains with Hammy Bridge. Enjoy a seamless experience with our user-friendly interface powered by Squid.",
};

export default function BridgePage() {
  return (
    <div className="flex flex-col max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-500">
        Bridge
      </h1>
      <PoweredBySquid className="w-60 h-20 mx-auto" />

      <div className="flex flex-col items-center text-center px-4 mx-auto col-span-1 md:col-span-6">
        <div className="max-w-2xl w-full backdrop-blur-sm bg-white/80 p-2 rounded-3xl">
          <Suspense fallback={<Skeleton className="w-[450px] h-[600px]" />}>
            <BridgeComponent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
