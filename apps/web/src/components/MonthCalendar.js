import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAppState } from "../state/AppContext";
const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
function getDaysGrid(year, month) {
    const firstDay = new Date(year, month - 1, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0)
        startDow = 6;
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
    const cells = [];
    for (let i = startDow - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        const prevMonth = month - 1 < 1 ? 12 : month - 1;
        const prevYear = month - 1 < 1 ? year - 1 : year;
        cells.push({
            day: d,
            currentMonth: false,
            date: `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({
            day: d,
            currentMonth: true,
            date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        });
    }
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
        for (let d = 1; d <= remaining; d++) {
            const nextMonth = month + 1 > 12 ? 1 : month + 1;
            const nextYear = month + 1 > 12 ? year + 1 : year;
            cells.push({
                day: d,
                currentMonth: false,
                date: `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
            });
        }
    }
    return cells;
}
export function MonthCalendar({ assetId }) {
    const { selectedMonth, setSelectedMonth, monthAvailability, loadMonthAvailability, selectDate, setCalendarView, loadAvailability, } = useAppState();
    const [year, month] = selectedMonth.split("-").map(Number);
    const monthLabel = new Date(year, month - 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
    const cells = getDaysGrid(year, month);
    const today = new Date().toISOString().slice(0, 10);
    const goToPrevMonth = () => {
        const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
        setSelectedMonth(prev);
        loadMonthAvailability(assetId, prev);
    };
    const goToNextMonth = () => {
        const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
        setSelectedMonth(next);
        loadMonthAvailability(assetId, next);
    };
    const handleDayClick = (date) => {
        selectDate(date);
        loadAvailability(assetId, date);
        setCalendarView("day");
    };
    const getDayStatus = (date, isCurrentMonth) => {
        if (!isCurrentMonth)
            return "other";
        if (date < today)
            return "past";
        const dayInfo = monthAvailability?.days.find((d) => d.date === date);
        if (!dayInfo || dayInfo.slotCount === 0)
            return "unavailable";
        if (dayInfo.hasOpenSlots)
            return "available";
        return "unavailable";
    };
    return (_jsxs("div", { className: "month-calendar", children: [_jsxs("div", { className: "month-calendar-header", children: [_jsx("button", { className: "month-nav-btn", onClick: goToPrevMonth, "aria-label": "Previous month", children: "\u2190" }), _jsx("span", { className: "month-label", children: monthLabel }), _jsx("button", { className: "month-nav-btn", onClick: goToNextMonth, "aria-label": "Next month", children: "\u2192" })] }), _jsx("div", { className: "month-day-headers", children: DAY_LABELS.map((label) => (_jsx("div", { className: "month-day-header", children: label }, label))) }), _jsx("div", { className: "month-grid", children: cells.map((cell) => {
                    const status = getDayStatus(cell.date, cell.currentMonth);
                    const isClickable = status === "available";
                    return (_jsxs("button", { className: `month-cell month-cell--${status}`, disabled: !isClickable, onClick: () => isClickable && handleDayClick(cell.date), "aria-label": `${cell.day}, ${status}`, children: [cell.day, status === "available" && _jsx("span", { className: "month-cell-dot" })] }, cell.date));
                }) }), _jsxs("div", { className: "month-legend", children: [_jsxs("div", { className: "month-legend-item", children: [_jsx("span", { className: "month-legend-swatch month-legend-swatch--available" }), "Has open slots"] }), _jsxs("div", { className: "month-legend-item", children: [_jsx("span", { className: "month-legend-swatch month-legend-swatch--unavailable" }), "Unavailable"] })] }), _jsx("p", { className: "month-hint", children: "Tap a green date to see available hours" })] }));
}
