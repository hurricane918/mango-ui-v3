import { useCallback, useState } from 'react'
import useMangoStore, { mangoClient } from '../stores/useMangoStore'
import { Table, Thead, Tbody, Tr, Th, Td } from 'react-super-responsive-table'
import {
  getMarketByPublicKey,
  nativeI80F48ToUi,
  PerpAccount,
  PerpMarket,
  QUOTE_INDEX,
  ZERO_BN,
} from '@blockworks-foundation/mango-client'
import Button from './Button'
import { notify } from '../utils/notifications'
import SideBadge from './SideBadge'
import Loading from './Loading'
import { formatUsdValue, usdFormatter } from '../utils'
import useTradeHistory from '../hooks/useTradeHistory'
import Tooltip from './Tooltip'
import { SettlePnlTooltip } from './MarketPosition'
import usePerpPositions from '../hooks/usePerpPositions'
import MarketCloseModal from './MarketCloseModal'

export function getAvgEntryPrice(
  mangoAccount,
  perpAccount,
  perpMarket,
  perpTradeHistory
) {
  let avgEntryPrice = '--'
  if (perpTradeHistory.length) {
    try {
      avgEntryPrice = formatUsdValue(
        perpAccount.getAverageOpenPrice(
          mangoAccount,
          perpMarket,
          perpTradeHistory
        )
      )
    } catch {
      avgEntryPrice = '--'
    }
  }
  return avgEntryPrice
}

export function getBreakEvenPrice(
  mangoAccount,
  perpAccount,
  perpMarket,
  perpTradeHistory
) {
  let breakEvenPrice = '--'
  if (perpTradeHistory.length) {
    try {
      breakEvenPrice = formatUsdValue(
        perpAccount.getBreakEvenPrice(
          mangoAccount,
          perpMarket,
          perpTradeHistory
        )
      )
    } catch {
      breakEvenPrice = '--'
    }
  }
  return breakEvenPrice
}

const PositionsTable = () => {
  const actions = useMangoStore((s) => s.actions)
  const groupConfig = useMangoStore((s) => s.selectedMangoGroup.config)
  const mangoGroup = useMangoStore((s) => s.selectedMangoGroup.current)
  const mangoAccount = useMangoStore((s) => s.selectedMangoAccount.current)
  const mangoCache = useMangoStore((s) => s.selectedMangoGroup.cache)
  const allMarkets = useMangoStore((s) => s.selectedMangoGroup.markets)
  const [settlingPerpAcc, setSettlingPerpAcc] = useState(null)
  const [showMarketCloseModal, setShowMarketCloseModal] = useState(false)
  const tradeHistory = useTradeHistory()
  const setMangoStore = useMangoStore((s) => s.set)
  const perpPositions = usePerpPositions()

  const handleCloseWarning = useCallback(() => {
    setShowMarketCloseModal(false)
  }, [])

  const handleSettlePnl = async (
    perpMarket: PerpMarket,
    perpAccount: PerpAccount
  ) => {
    const mangoAccount = useMangoStore.getState().selectedMangoAccount.current
    const mangoGroup = useMangoStore.getState().selectedMangoGroup.current
    const wallet = useMangoStore.getState().wallet.current
    const marketIndex = mangoGroup.getPerpMarketIndex(perpMarket.publicKey)
    setSettlingPerpAcc(perpAccount)
    try {
      const txid = await mangoClient.settlePnl(
        mangoGroup,
        mangoCache,
        mangoAccount,
        perpMarket,
        mangoGroup.rootBankAccounts[QUOTE_INDEX],
        mangoCache.priceCache[marketIndex].price,
        wallet
      )
      actions.fetchMangoAccounts()
      notify({
        title: 'Successfully settled PNL',
        description: '',
        txid,
      })
    } catch (e) {
      console.log('Error settling PNL: ', `${e}`, `${perpAccount}`)
      notify({
        title: 'Error settling PNL',
        description: e.message,
        txid: e.txid,
        type: 'error',
      })
    } finally {
      setSettlingPerpAcc(null)
    }
  }

  const handleSizeClick = (size) => {
    setMangoStore((state) => {
      state.tradeForm.baseSize = size
    })
  }

  return (
    <div className="flex flex-col pb-2 pt-4">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="align-middle inline-block min-w-full sm:px-6 lg:px-8">
          {perpPositions.length ? (
            <div className="overflow-hidden border-b border-th-bkg-2 sm:rounded-m">
              <Table className="min-w-full divide-y divide-th-bkg-2">
                <Thead>
                  <Tr className="text-th-fgd-3 text-xs">
                    <Th scope="col" className="px-6 py-2 text-left font-normal">
                      Market
                    </Th>
                    <Th scope="col" className="px-2 py-2 text-left font-normal">
                      Side
                    </Th>
                    <Th scope="col" className="px-2 py-2 text-left font-normal">
                      Position size
                    </Th>
                    <Th scope="col" className="px-2 py-2 text-left font-normal">
                      Notional size
                    </Th>
                    <Th scope="col" className="px-2 py-2 text-left font-normal">
                      Avg entry price
                    </Th>
                    <Th scope="col" className="px-2 py-2 text-left font-normal">
                      Break-even price
                    </Th>
                    <Th scope="col" className="px-2 py-2 text-left font-normal">
                      <Tooltip content={<SettlePnlTooltip />}>
                        <Tooltip.Content>Unsettled PnL</Tooltip.Content>
                      </Tooltip>
                    </Th>
                    <Th scope="col" className={`relative px-6 py-2.5`}>
                      <span className={`sr-only`}>Edit</span>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {perpPositions.map(({ perpAccount, marketIndex }, index) => {
                    const perpMarketInfo = mangoGroup.perpMarkets[marketIndex]
                    const marketConfig = getMarketByPublicKey(
                      groupConfig,
                      perpMarketInfo.perpMarket
                    )
                    const perpMarketCache =
                      mangoCache.perpMarketCache[marketIndex]
                    const price = mangoCache.priceCache[marketIndex].price
                    const perpMarket = allMarkets[
                      perpMarketInfo.perpMarket.toString()
                    ] as PerpMarket
                    const perpTradeHistory = tradeHistory.filter(
                      (t) => t.marketName === marketConfig.name
                    )

                    return (
                      <Tr
                        key={`${marketIndex}`}
                        className={`border-b border-th-bkg-3
                        ${index % 2 === 0 ? `bg-th-bkg-3` : `bg-th-bkg-2`}
                      `}
                      >
                        <Td className="px-6 py-2 whitespace-nowrap text-sm text-th-fgd-1">
                          <div className="flex items-center">
                            <img
                              alt=""
                              width="20"
                              height="20"
                              src={`/assets/icons/${marketConfig.baseSymbol.toLowerCase()}.svg`}
                              className={`mr-2.5`}
                            />
                            <div>{marketConfig.name}</div>
                          </div>
                        </Td>
                        <Td className="px-2 py-2 whitespace-nowrap text-sm text-th-fgd-1">
                          {!perpAccount.basePosition.eq(ZERO_BN) ? (
                            <SideBadge
                              side={
                                perpAccount.basePosition.gt(ZERO_BN)
                                  ? 'long'
                                  : 'short'
                              }
                            />
                          ) : (
                            '-'
                          )}
                        </Td>
                        <Td className="px-2 py-2 whitespace-nowrap text-sm text-th-fgd-1">
                          {perpAccount &&
                          Math.abs(
                            perpMarket.baseLotsToNumber(
                              perpAccount.basePosition
                            )
                          ) > 0 ? (
                            <span
                              className="cursor-pointer underline hover:no-underline"
                              onClick={() =>
                                handleSizeClick(
                                  Math.abs(
                                    perpMarket.baseLotsToNumber(
                                      perpAccount.basePosition
                                    )
                                  )
                                )
                              }
                            >
                              {`${Math.abs(
                                perpMarket.baseLotsToNumber(
                                  perpAccount.basePosition
                                )
                              )} ${marketConfig.baseSymbol}`}
                            </span>
                          ) : (
                            `0 ${marketConfig.baseSymbol}`
                          )}
                        </Td>
                        <Th
                          scope="col"
                          className="px-2 py-2 text-left font-normal"
                        >
                          {usdFormatter(
                            Math.abs(
                              perpMarket.baseLotsToNumber(
                                perpAccount.basePosition
                              ) *
                                mangoGroup
                                  .getPrice(marketIndex, mangoCache)
                                  .toNumber()
                            )
                          )}
                        </Th>
                        <Td className="px-2 py-2 whitespace-nowrap text-sm text-th-fgd-1">
                          {getAvgEntryPrice(
                            mangoAccount,
                            perpAccount,
                            perpMarket,
                            perpTradeHistory
                          )}
                        </Td>
                        <Td className="px-2 py-2 whitespace-nowrap text-sm text-th-fgd-1">
                          {getBreakEvenPrice(
                            mangoAccount,
                            perpAccount,
                            perpMarket,
                            perpTradeHistory
                          )}
                        </Td>
                        <Td className="px-2 py-2 whitespace-nowrap text-sm text-th-fgd-1">
                          {usdFormatter(
                            +nativeI80F48ToUi(
                              perpAccount.getPnl(
                                perpMarketInfo,
                                perpMarketCache,
                                price
                              ),
                              marketConfig.quoteDecimals
                            ),
                            marketConfig.quoteDecimals
                          )}
                        </Td>
                        <Td className="px-2 py-2 whitespace-nowrap text-sm text-th-fgd-1">
                          <div className="flex justify-end">
                            {Math.abs(
                              perpMarket.baseLotsToNumber(
                                perpAccount.basePosition
                              )
                            ) > 0 ? (
                              <Button
                                onClick={() => setShowMarketCloseModal(true)}
                                className="ml-3 text-xs pt-0 pb-0 h-8 pl-3 pr-3"
                              >
                                <span>Market Close</span>
                              </Button>
                            ) : null}
                            <Button
                              onClick={() =>
                                handleSettlePnl(perpMarket, perpAccount)
                              }
                              className="ml-3 text-xs pt-0 pb-0 h-8 pl-3 pr-3"
                            >
                              {settlingPerpAcc == perpAccount ? (
                                <Loading />
                              ) : (
                                <span>Settle PNL</span>
                              )}
                            </Button>
                          </div>
                        </Td>
                        {showMarketCloseModal ? (
                          <MarketCloseModal
                            isOpen={showMarketCloseModal}
                            onClose={handleCloseWarning}
                            market={perpMarket}
                            marketIndex={marketIndex}
                          />
                        ) : null}
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </div>
          ) : (
            <div
              className={`w-full text-center py-6 bg-th-bkg-1 text-th-fgd-3 rounded-md`}
            >
              No perp positions
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PositionsTable
