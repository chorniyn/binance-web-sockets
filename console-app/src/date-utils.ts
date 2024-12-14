export function localDateToLocalString(year: number, month: number, day: number): string {
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

export function dateToLocalString(date: Date): string {
    return localDateToLocalString(date.getFullYear(), date.getMonth() + 1, date.getDate())
}
