import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../utils/dateTime';

interface SportsCalendarModalProps {
  isOpen: boolean;
  selectedDate: Date;
  leagueName?: string;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

export function SportsCalendarModal({
  isOpen,
  selectedDate,
  leagueName,
  onSelectDate,
  onClose,
}: SportsCalendarModalProps) {
  useTranslation();
  const [viewDate, setViewDate] = useState<Date>(() => new Date(selectedDate));
  const [tempSelectedDate, setTempSelectedDate] = useState<Date>(() => new Date(selectedDate));

  useEffect(() => {
    if (isOpen) {
      setViewDate(new Date(selectedDate));
      setTempSelectedDate(new Date(selectedDate));
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setViewDate(today);
    setTempSelectedDate(today);
    onSelectDate(today);
    onClose();
  };

  const handleJumpToYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setViewDate(yesterday);
    setTempSelectedDate(yesterday);
    onSelectDate(yesterday);
    onClose();
  };

  const handleJumpToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setViewDate(tomorrow);
    setTempSelectedDate(tomorrow);
    onSelectDate(tomorrow);
    onClose();
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isToday = (d: Date) => isSameDay(d, new Date());

  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const leadingCells = firstDayOfWeek;
    const totalInclusive = leadingCells + daysInCurrentMonth;
    // Pad to a full number of weeks (at least 1, capped at a tidy 6-row grid).
    const rowsNeeded = Math.max(1, Math.ceil(totalInclusive / 7));
    const totalCells = rowsNeeded * 7;

    const cells: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dayNumber: number;
    }> = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({
        date: prevDate,
        isCurrentMonth: false,
        dayNumber: prevDate.getDate(),
      });
    }

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const currDate = new Date(year, month, day);
      cells.push({
        date: currDate,
        isCurrentMonth: true,
        dayNumber: day,
      });
    }

    const remainingCells = Math.max(0, totalCells - cells.length);
    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(year, month + 1, day);
      cells.push({
        date: nextDate,
        isCurrentMonth: false,
        dayNumber: day,
      });
    }

    return cells;
  }, [year, month]);

  if (!isOpen) return null;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleCellClick = (cellDate: Date) => {
    setTempSelectedDate(cellDate);
    onSelectDate(cellDate);
    onClose();
  };

  const formattedSelected = formatDate(tempSelectedDate, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return createPortal(
    <div className="sports-calendar-modal-overlay" onClick={onClose}>
      <div className="sports-calendar-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sports-calendar-modal-header">
          <div className="sports-calendar-header-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h3>Select Game Date</h3>
            {leagueName && <span className="sports-calendar-league-badge">{leagueName}</span>}
          </div>
          <button className="sports-calendar-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Quick Shortcuts */}
        <div className="sports-calendar-shortcuts">
          <button onClick={handleJumpToYesterday} className="sports-calendar-shortcut-btn">
            Yesterday
          </button>
          <button onClick={handleJumpToToday} className="sports-calendar-shortcut-btn highlight">
            Today
          </button>
          <button onClick={handleJumpToTomorrow} className="sports-calendar-shortcut-btn">
            Tomorrow
          </button>
        </div>

        {/* Month Navigation */}
        <div className="sports-calendar-month-nav">
          <button onClick={handlePrevMonth} className="sports-calendar-nav-arrow" title="Previous Month">
            ‹
          </button>
          <div className="sports-calendar-month-label">
            <span className="sports-calendar-month-name">{monthNames[month]}</span>
            <span className="sports-calendar-year">{year}</span>
          </div>
          <button onClick={handleNextMonth} className="sports-calendar-nav-arrow" title="Next Month">
            ›
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="sports-calendar-weekdays">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="sports-calendar-days-grid">
          {calendarCells.map((cell, index) => {
            const selected = isSameDay(cell.date, tempSelectedDate);
            const today = isToday(cell.date);

            let classNames = 'sports-calendar-day-cell';
            if (!cell.isCurrentMonth) classNames += ' other-month';
            if (today) classNames += ' is-today';
            if (selected) classNames += ' is-selected';

            return (
              <button
                key={index}
                className={classNames}
                onClick={() => handleCellClick(cell.date)}
              >
                <span className="day-number">{cell.dayNumber}</span>
                {today && <span className="today-dot" title="Today" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sports-calendar-modal-footer">
          <div className="sports-calendar-footer-selected">
            <span className="footer-label">Selected Date:</span>
            <span className="footer-date">{formattedSelected}</span>
          </div>
          <button className="sports-calendar-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
