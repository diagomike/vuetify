// Composables
import { getWeek, useDate } from '@/composables/date/date'
import { useProxiedModel } from '@/composables/proxiedModel'

// Utilities
import { computed } from 'vue'
import { propsFactory, wrapInArray } from '@/util'

// Types
import type { PropType } from 'vue'

// Types
export interface CalendarProps {
  allowedDates: unknown[] | ((date: unknown) => boolean)
  disabled: boolean
  displayValue: unknown
  modelValue: unknown[]
  max: unknown
  min: unknown
  showAdjacentMonths?: boolean
  month: number | string
  year: number | string

  'onUpdate:modelValue': (value: unknown[]) => void
  'onUpdate:month': (value: number) => void
  'onUpdate:year': (value: number) => void
}

// Composables
export const makeCalendarProps = propsFactory({
  allowedDates: [Array, Function],
  disabled: Boolean,
  displayValue: null as any as PropType<unknown>,
  modelValue: Array as PropType<unknown[] | undefined>,
  month: [Number, String],
  max: null as any as PropType<unknown>,
  min: null as any as PropType<unknown>,
  showAdjacentMonths: Boolean,
  year: [Number, String],
}, 'calendar')

export function useCalendar (props: CalendarProps) {
  const adapter = useDate()
  const model = useProxiedModel(
    props,
    'modelValue',
    [],
    v => wrapInArray(v),
  )
  const displayValue = computed(() => {
    if (props.displayValue) return adapter.date(props.displayValue)
    if (model.value.length > 0) return adapter.date(model.value[0])
    if (props.min) return adapter.date(props.min)
    if (Array.isArray(props.allowedDates)) return adapter.date(props.allowedDates[0])

    return adapter.date()
  })

  const year = useProxiedModel(
    props,
    'year',
    undefined,
    v => {
      const value = v != null ? Number(v) : adapter.getYear(displayValue.value)

      return adapter.startOfYear(adapter.setYear(adapter.date(), value))
    },
    v => adapter.getYear(v)
  )

  const month = useProxiedModel(
    props,
    'month',
    undefined,
    v => {
      const value = v != null ? Number(v) : adapter.getMonth(displayValue.value)
      const date = adapter.setYear(adapter.date(), adapter.getYear(year.value))

      return adapter.setMonth(date, value)
    },
    v => adapter.getMonth(v)
  )

  const weeksInMonth = computed<Date[][]>((): Date[][] => {
    const weeks = adapter.getWeekArray(month.value)

    const days = weeks.flat()

    // Make sure there's always 6 weeks in month (6 * 7 days)
    // But only do it if we're not hiding adjacent months?
    const daysInMonth = 6 * 7
    if (days.length < daysInMonth) {
      const lastDay = days[days.length - 1]

      let week = []
      for (let day = 1; day <= daysInMonth - days.length; day++) {
        week.push(adapter.addDays(lastDay, day))

        if (day % 7 === 0) {
          weeks.push(week)
          week = []
        }
      }
    }

    return weeks as Date[][]
  })

  const genDays = (days: Date[], today: Date) => {
    return days.map((date, index) => {
      const isoDate = adapter.toISO(date)
      const isAdjacent = !adapter.isSameMonth(date, month.value)
      const isStart = adapter.isSameDay(date, adapter.startOfMonth(month.value))
      const isEnd = adapter.isSameDay(date, adapter.endOfMonth(month.value))
      const isSame = adapter.isSameDay(date, month.value)

      return {
        date,
        isoDate,
        formatted: adapter.format(date, 'keyboardDate'),
        year: adapter.getYear(date),
        month: adapter.getMonth(date),
        isDisabled: isDisabled(date),
        isWeekStart: index % 7 === 0,
        isWeekEnd: index % 7 === 6,
        isToday: adapter.isSameDay(date, today),
        isAdjacent,
        isHidden: isAdjacent && !props.showAdjacentMonths,
        isStart,
        isSelected: model.value.some(value => adapter.isSameDay(date, value)),
        isEnd,
        isSame,
        localized: adapter.format(date, 'dayOfMonth'),
      }
    })
  }

  const daysInWeek = computed(() => {
    const lastDay = adapter.startOfWeek(model.value)
    const week = []
    for (let day = 0; day <= 6; day++) {
      week.push(adapter.addDays(lastDay, day))
    }

    const days = week as Date[]

    const today = adapter.date() as Date

    return genDays(days, today)
  })

  const daysInMonth = computed(() => {
    const days = weeksInMonth.value.flat()
    const today = adapter.date() as Date

    return genDays(days, today)
  })

  const weekNumbers = computed(() => {
    return weeksInMonth.value.map(week => {
      return week.length ? getWeek(adapter, week[0]) : null
    })
  })

  function isDisabled (value: unknown) {
    if (props.disabled) return true

    const date = adapter.date(value)

    if (props.min && adapter.isAfter(adapter.date(props.min), date)) return true
    if (props.max && adapter.isAfter(date, adapter.date(props.max))) return true

    if (Array.isArray(props.allowedDates) && props.allowedDates.length > 0) {
      return !props.allowedDates.some(d => adapter.isSameDay(adapter.date(d), date))
    }

    if (typeof props.allowedDates === 'function') {
      return !props.allowedDates(date)
    }

    return false
  }

  return {
    displayValue,
    daysInMonth,
    daysInWeek,
    genDays,
    model,
    weeksInMonth,
    weekNumbers,
  }
}
