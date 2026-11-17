import type { StateCreator } from 'zustand'
import { findNode, resolveAction, resolveBoardingPassAction, resolveChoice, resolveFreeText, resolveInputSubmission, resolveListRow } from '../../engine/ConversationEngine'
import { matchTrigger } from '../../engine/triggerMatcher'
import { consumeRcsTrailingSuggestions } from '../../engine/messageAttachment'
import { downloadBoardingPassImage } from '../../utils/boardingPassFile'
import { findActiveInput } from '../../utils/selectors'
import { BUILT_IN_SCENARIOS } from '../../scenarios'
import type { SimulatorState } from '../storeTypes'
import type { StoreContext } from '../storeContext'

export const createInteractionSlice = (ctx: StoreContext): StateCreator<SimulatorState, [], [], Pick<SimulatorState, 'handleChoice' | 'handleListRowSelect' | 'handleAction' | 'handleInputSubmit' | 'handleFreeText' | 'handleOtpSubmit' | 'simulateCardAction' | 'handleBoardingPassAction'>> => (set, get) => {
  const { pushSnapshot, applyInteractionResult } = ctx
  return {
    handleChoice: (choice) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      pushSnapshot()
      applyInteractionResult(resolveChoice(choice, s.currentNodeId))
    },

    handleListRowSelect: (row) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      pushSnapshot()
      applyInteractionResult(resolveListRow(row, s.currentNodeId))
    },

    handleAction: (action) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      if (action.type === 'reply' && action.startScenarioId) {
        if (!BUILT_IN_SCENARIOS.some((scenario) => scenario.id === action.startScenarioId)) return
        get().loadBuiltInScenario(action.startScenarioId, true)
        return
      }
      if (action.type !== 'reply') {
        const history = s.channel === 'rcs' ? consumeRcsTrailingSuggestions(s.history, s.currentNodeId) : s.history
        set((state) => ({
          history,
          events: [...state.events, { type: 'external_action', at: Date.now(), action }],
          externalActionModal: action,
        }))
        return
      }
      pushSnapshot()
      applyInteractionResult(resolveAction(action, s.currentNodeId))
    },

    handleInputSubmit: (value) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      const activeInput = findActiveInput(s.history, s.currentNodeId)
      if (!activeInput || activeInput.message.type !== 'input') return
      pushSnapshot()
      applyInteractionResult(
        resolveInputSubmission(s.currentNodeId, activeInput.message.variable, activeInput.message.next, value),
      )
    },

    handleFreeText: (text) => {
      const s = get()
      if (s.liveSessionActive || !s.flow || !s.currentNodeId || !text.trim()) return

      // A node-level `freeTextNext` swallows any typed text (even a global
      // trigger keyword): the text is sent and the flow moves on, unanalysed.
      const freeTextNext = findNode(s.flow, s.currentNodeId)?.freeTextNext
      if (freeTextNext) {
        pushSnapshot()
        const result = resolveFreeText(s.currentNodeId, text, { keywords: [], next: freeTextNext })
        if (s.currentNodeId === 'survey_comment') {
          result.setVariables = { npsComment: text }
        }
        applyInteractionResult(result)
        return
      }

      // A global keyword trigger wins even over an active structured `input`
      // field — it's meant as an "anytime" escape hatch (e.g. "type CANCEL
      // anytime"), matching how real bots typically implement keyword
      // commands that interrupt whatever the user was doing.
      const trigger = matchTrigger(s.flow.triggers ?? [], text)
      if (!trigger) {
        const activeInput = findActiveInput(s.history, s.currentNodeId)
        if (activeInput && activeInput.message.type === 'input') {
          get().handleInputSubmit(text)
          return
        }
      }

      pushSnapshot()
      applyInteractionResult(resolveFreeText(s.currentNodeId, text, trigger))
    },

    handleOtpSubmit: (message, code) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      if (message.message.type !== 'otp') return
      pushSnapshot()
      applyInteractionResult(
        resolveInputSubmission(s.currentNodeId, message.message.variable, message.message.next, code),
      )
    },

    simulateCardAction: (toastMessage, next, set) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      get().showToast(toastMessage)
      if (next || set) {
        pushSnapshot()
        applyInteractionResult({ setVariables: set, nextNodeId: next })
      }
    },

    handleBoardingPassAction: (action, message) => {
      const s = get()
      if (s.liveSessionActive) return
      if (!s.flow || !s.currentNodeId) return
      if (message.message.type !== 'boarding_pass') return
      const bp = message.message

      if (action.type === 'download') {
        void downloadBoardingPassImage({
          passengerName: bp.passengerName,
          airline: bp.airline,
          flightNumber: bp.flightNumber,
          date: bp.date,
          originCode: bp.origin.code,
          originCity: bp.origin.city,
          destinationCode: bp.destination.code,
          destinationCity: bp.destination.city,
          departureTime: bp.departureTime,
          boardingTime: bp.boardingTime,
          gate: bp.gate,
          terminal: bp.terminal,
          seat: bp.seat,
          boardingGroup: bp.boardingGroup,
          bookingReference: bp.bookingReference,
          cabinClass: bp.cabinClass,
        })
        get().showToast('Boarding pass downloaded')
      } else if (action.type === 'add_to_wallet') {
        get().showToast('Added to Wallet (simulated)')
      } else if (action.type === 'view') {
        set({ boardingPassPreview: message })
        return
      }

      const result = resolveBoardingPassAction(action, s.currentNodeId)
      if (result.userMessage || result.setVariables || result.nextNodeId) {
        pushSnapshot()
        applyInteractionResult(result)
      }
    },

  }
}
