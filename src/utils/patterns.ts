import { supabase } from '../lib/supabase'

export interface PatternReport {
  weakestDayOfWeek: string | null
  strongestDayOfWeek: string | null
  caloriesTougher: boolean
  movementTougher: boolean
  currentWeakStreak: number
  longestCompleteStreak: number
  totalComplete: number
  totalPartial: number
  totalFailed: number
  hasEnoughData: boolean
  patternMessages: string[]
  needsBadge: string[]
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MIN_DATA = 14

function defaultReport(): PatternReport {
  return {
    weakestDayOfWeek: null,
    strongestDayOfWeek: null,
    caloriesTougher: false,
    movementTougher: false,
    currentWeakStreak: 0,
    longestCompleteStreak: 0,
    totalComplete: 0,
    totalPartial: 0,
    totalFailed: 0,
    hasEnoughData: false,
    patternMessages: [],
    needsBadge: [],
  }
}

export async function detectPatterns(userId: string): Promise<PatternReport> {
  try {
    const { data, error } = await supabase
      .from('daily_accountability')
      .select('logged_date, result, calories_hit, movement_hit')
      .eq('user_id', userId)
      .order('logged_date', { ascending: true })

    if (error || !data || data.length < MIN_DATA) {
      return defaultReport()
    }

    const rows = data

    let totalComplete = 0, totalPartial = 0, totalFailed = 0
    for (const r of rows) {
      if (r.result === 'complete') totalComplete++
      else if (r.result === 'partial') totalPartial++
      else totalFailed++
    }

    // Day-of-week weak/strong ratios
    const dayWeakCount: Record<number, number> = {}
    const dayStrongCount: Record<number, number> = {}
    const dayTotal: Record<number, number> = {}
    for (const r of rows) {
      // noon local time avoids any UTC-vs-local date shift
      const dow = new Date(r.logged_date + 'T12:00:00').getDay()
      dayTotal[dow] = (dayTotal[dow] ?? 0) + 1
      if (r.result === 'complete') {
        dayStrongCount[dow] = (dayStrongCount[dow] ?? 0) + 1
      } else {
        dayWeakCount[dow] = (dayWeakCount[dow] ?? 0) + 1
      }
    }

    let weakestDow: number | null = null, worstRatio = -1
    let strongestDow: number | null = null, bestRatio = -1
    for (const [dowStr, total] of Object.entries(dayTotal)) {
      if (total < 2) continue
      const dow = Number(dowStr)
      const weakRatio = (dayWeakCount[dow] ?? 0) / total
      const strongRatio = (dayStrongCount[dow] ?? 0) / total
      if (weakRatio > worstRatio) { worstRatio = weakRatio; weakestDow = dow }
      if (strongRatio > bestRatio) { bestRatio = strongRatio; strongestDow = dow }
    }
    const weakestDayOfWeek = weakestDow !== null ? DAYS[weakestDow] : null
    const strongestDayOfWeek = strongestDow !== null ? DAYS[strongestDow] : null

    // Calorie vs movement misses
    let calorieMisses = 0, movementMisses = 0
    for (const r of rows) {
      if (r.result === 'failed') {
        calorieMisses++
        movementMisses++
      } else if (r.result === 'partial') {
        if (!r.calories_hit) calorieMisses++
        if (!r.movement_hit) movementMisses++
      }
    }
    const caloriesTougher = calorieMisses > movementMisses
    const movementTougher = movementMisses > calorieMisses

    // Current consecutive weak streak (count backward from end)
    let currentWeakStreak = 0
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].result !== 'complete') currentWeakStreak++
      else break
    }

    // Longest complete streak ever
    let longestCompleteStreak = 0, curRun = 0
    for (const r of rows) {
      if (r.result === 'complete') {
        curRun++
        if (curRun > longestCompleteStreak) longestCompleteStreak = curRun
      } else {
        curRun = 0
      }
    }

    const patternMessages: string[] = []
    if (weakestDayOfWeek) {
      patternMessages.push(`${weakestDayOfWeek}s are where your discipline breaks. Plan differently.`)
    }
    if (caloriesTougher) {
      patternMessages.push('You move well. The kitchen is where you lose the mission.')
    }
    if (movementTougher) {
      patternMessages.push('Your food discipline is strong. Movement is your gap.')
    }
    if (currentWeakStreak >= 3) {
      patternMessages.push('Three consecutive days below standard. This is a pattern, not a coincidence.')
    }
    if (totalFailed === 0) {
      patternMessages.push('You have not failed a single day. That is not common.')
    }
    if (totalPartial > totalComplete) {
      patternMessages.push('More partial days than complete. Close is not enough.')
    }

    // Badge eligibility checks
    const needsBadge: string[] = []

    // pattern_breaker: last 4 occurrences of the weakest day are all complete
    if (weakestDow !== null) {
      const occurrences = rows.filter(r => new Date(r.logged_date + 'T12:00:00').getDay() === weakestDow)
      if (occurrences.length >= 4 && occurrences.slice(-4).every(r => r.result === 'complete')) {
        needsBadge.push('pattern_breaker')
      }
    }

    // consistent: 30 consecutive logged dates with no gaps
    if (rows.length >= 30) {
      let maxConsec = 1, curConsec = 1
      for (let i = 1; i < rows.length; i++) {
        const prev = new Date(rows[i - 1].logged_date + 'T12:00:00')
        const curr = new Date(rows[i].logged_date + 'T12:00:00')
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
        if (diffDays === 1) { curConsec++; if (curConsec > maxConsec) maxConsec = curConsec }
        else curConsec = 1
      }
      if (maxConsec >= 30) needsBadge.push('consistent')
    }

    return {
      weakestDayOfWeek,
      strongestDayOfWeek,
      caloriesTougher,
      movementTougher,
      currentWeakStreak,
      longestCompleteStreak,
      totalComplete,
      totalPartial,
      totalFailed,
      hasEnoughData: true,
      patternMessages,
      needsBadge,
    }
  } catch {
    return defaultReport()
  }
}
