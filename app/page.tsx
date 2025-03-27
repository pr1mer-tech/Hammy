import { SwapContainer } from "@/components/swap/swap-container"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-500">
        Swap Tokens
      </h1>
      <SwapContainer />
    </div>
  )
}

