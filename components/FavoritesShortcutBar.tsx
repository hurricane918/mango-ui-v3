import useLocalStorageState from '../hooks/useLocalStorageState'
import { FAVORITE_MARKETS_KEY } from './TradeNavMenu'
import { StarIcon } from '@heroicons/react/solid'
import { QuestionMarkCircleIcon } from '@heroicons/react/outline'
import useMangoStore from '../stores/useMangoStore'
import { useViewport } from '../hooks/useViewport'
import { breakpoints } from './TradePageGrid'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { initialMarket } from './SettingsModal'
import * as MonoIcons from './icons'
import { Transition } from '@headlessui/react'

const FavoritesShortcutBar = () => {
  const [favoriteMarkets] = useLocalStorageState(FAVORITE_MARKETS_KEY, [])
  const marketInfo = useMangoStore((s) => s.marketInfo)
  const { width } = useViewport()
  const isMobile = width ? width < breakpoints.sm : false
  const { asPath } = useRouter()

  const renderIcon = (symbol) => {
    const iconName = `${symbol.slice(0, 1)}${symbol
      .slice(1, 4)
      .toLowerCase()}MonoIcon`

    const SymbolIcon = MonoIcons[iconName] || QuestionMarkCircleIcon
    return <SymbolIcon className={`h-3.5 w-auto mr-1.5`} />
  }

  return !isMobile ? (
    <Transition
      appear={true}
      className="bg-th-bkg-3 flex items-center px-4 xl:px-6 py-2 space-x-4"
      show={favoriteMarkets.length > 0}
      enter="transition-all ease-in duration-200"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition ease-out duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <StarIcon className="h-5 text-th-fgd-4 w-5" />
      {favoriteMarkets.map((mkt) => {
        const mktInfo = marketInfo.find((info) => info.name === mkt.name)
        return (
          <Link href={`/?name=${mkt.name}`} key={mkt.name} shallow={true}>
            <a
              className={`default-transition flex items-center py-1 text-xs hover:text-th-primary whitespace-nowrap ${
                asPath.includes(mkt.name) ||
                (asPath === '/' && initialMarket.name === mkt.name)
                  ? 'text-th-primary'
                  : 'text-th-fgd-3'
              }`}
            >
              {renderIcon(mkt.baseSymbol)}
              <span className="mb-0 mr-1.5 text-xs">{mkt.name}</span>
              <span
                className={`text-xs ${
                  mktInfo
                    ? mktInfo.change24h >= 0
                      ? 'text-th-green'
                      : 'text-th-red'
                    : 'text-th-fgd-4'
                }`}
              >
                {mktInfo ? `${(mktInfo.change24h * 100).toFixed(1)}%` : ''}
              </span>
            </a>
          </Link>
        )
      })}
    </Transition>
  ) : null
}

export default FavoritesShortcutBar
