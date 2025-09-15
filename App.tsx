
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';

// This map defines the one-way synchronization from the central sub-goals to the outer group centers.
// Key: "[row,col]" of the source cell in the central 3x3 grid.
// Value: [row, col] of the target cell (the center of an outer 3x3 grid).
const SYNC_MAP: { [key: string]: [number, number] } = {
  '3,3': [1, 1], '3,4': [1, 4], '3,5': [1, 7],
  '4,3': [4, 1],               '4,5': [4, 7],
  '5,3': [7, 1], '5,4': [7, 4], '5,5': [7, 7],
};

const OUTER_GRID_STYLES: { [key: string]: { base: string; center: string; text: string } } = {
  '0,0': { base: 'bg-rose-100',    center: 'bg-rose-200',    text: 'text-rose-900' },
  '0,1': { base: 'bg-orange-100',  center: 'bg-orange-200',  text: 'text-orange-900' },
  '0,2': { base: 'bg-amber-100',   center: 'bg-amber-200',   text: 'text-amber-900' },
  '1,0': { base: 'bg-lime-100',    center: 'bg-lime-200',    text: 'text-lime-900' },
  '1,2': { base: 'bg-teal-100',    center: 'bg-teal-200',    text: 'text-teal-900' },
  '2,0': { base: 'bg-cyan-100',    center: 'bg-cyan-200',    text: 'text-cyan-900' },
  '2,1': { base: 'bg-indigo-100',  center: 'bg-indigo-200',  text: 'text-indigo-900' },
  '2,2': { base: 'bg-purple-100',  center: 'bg-purple-200',  text: 'text-purple-900' },
};

interface CellTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
}

const CellTextarea: React.FC<CellTextareaProps> = ({ value, ...props }) => {
    const ref = useRef<HTMLTextAreaElement>(null);

    // Adjust height on initial render and whenever the value changes.
    // This is crucial for read-only cells that are updated programmatically.
    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto'; // Reset height to recalculate
            ref.current.style.height = `${ref.current.scrollHeight}px`; // Set to new scroll height
        }
    }, [value]);
    
    // This handler ensures height adjusts as the user types.
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = `${e.currentTarget.scrollHeight}px`;
        }
    };

    return <textarea ref={ref} value={value} onInput={handleInput} {...props} />;
};

const Header = () => (
  <header className="text-center mb-8">
    <h1 className="text-4xl font-bold text-slate-800 mb-2 font-['Noto_Sans_KR']">만다라트 계획표</h1>
    <p className="text-slate-600 font-['Noto_Sans_KR']">
      가운데 핵심 목표를 세우고, 주변 8칸에 세부 목표를 채워보세요. <br />
      세부 목표는 자동으로 주변 계획표의 중심 주제가 됩니다.
    </p>
  </header>
);

interface ControlsProps {
  onReset: () => void;
  onDownload: () => void;
  onSave: () => void;
  onLoad: (code: string) => void;
}

const Controls: React.FC<ControlsProps> = ({ onReset, onDownload, onSave, onLoad }) => {
  const [loadCode, setLoadCode] = useState('');

  const handleLoadClick = () => {
    onLoad(loadCode.trim());
  };

  return (
    <div className="flex flex-col items-center gap-4 mb-8 w-full">
      <div className="flex justify-center gap-4 flex-wrap">
        <button
          onClick={onSave}
          className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-75 transition-colors font-['Noto_Sans_KR']"
        >
          저장
        </button>
        <button
          onClick={onReset}
          className="px-6 py-2 bg-slate-500 text-white font-semibold rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75 transition-colors font-['Noto_Sans_KR']"
        >
          초기화
        </button>
        <button
          onClick={onDownload}
          className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 transition-colors font-['Noto_Sans_KR']"
        >
          이미지로 저장
        </button>
      </div>
      <div className="flex justify-center gap-2 w-full max-w-xs sm:max-w-sm">
        <input
          type="text"
          value={loadCode}
          onChange={(e) => setLoadCode(e.target.value)}
          placeholder="12자리 코드를 입력하세요"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow font-['Noto_Sans_KR']"
          maxLength={12}
        />
        <button
          onClick={handleLoadClick}
          className="px-6 py-2 bg-slate-700 text-white font-semibold rounded-lg shadow-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-75 transition-colors font-['Noto_Sans_KR']"
        >
          불러오기
        </button>
      </div>
    </div>
  );
};

interface NotificationProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onDismiss: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const baseClasses = 'fixed top-5 right-5 w-auto max-w-sm p-4 rounded-lg shadow-xl text-white text-sm z-50 transition-all duration-300 ease-in-out';
    const typeClasses = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-sky-500',
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <div className="flex items-center justify-between">
                <span>{message}</span>
                <button onClick={onDismiss} className="ml-4 p-1 text-xl leading-none">&times;</button>
            </div>
        </div>
    );
};

const SaveCodeModal = ({ code, onClose }: { code: string; onClose: () => void; }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2s
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 font-['Noto_Sans_KR']">
            <div className="bg-white rounded-lg p-6 sm:p-8 shadow-xl text-center w-full max-w-md">
                <h3 className="text-xl font-bold mb-3 text-slate-800">저장 완료!</h3>
                <p className="mb-5 text-slate-600">아래 코드를 복사하여 잘 보관해주세요.</p>
                <div className="bg-slate-100 p-4 rounded-md mb-6 flex items-center justify-between gap-2 sm:gap-4">
                    <span className="font-mono text-xl sm:text-2xl tracking-wider text-slate-700 select-all">{code}</span>
                    <button 
                        onClick={handleCopy} 
                        className={`px-4 py-2 rounded-md text-white font-semibold transition-colors ${copied ? 'bg-green-500' : 'bg-sky-600 hover:bg-sky-700'}`}
                    >
                        {copied ? '복사됨!' : '복사'}
                    </button>
                </div>
                <button 
                    onClick={onClose} 
                    className="w-full px-6 py-2 bg-slate-700 text-white font-semibold rounded-lg shadow-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-75 transition-colors"
                >
                    닫기
                </button>
            </div>
        </div>
    );
}

const ConfirmationModal = ({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void; }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 font-['Noto_Sans_KR']">
        <div className="bg-white rounded-lg p-6 sm:p-8 shadow-xl text-left w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 text-slate-800">{title}</h3>
            <p className="mb-6 text-slate-600">{message}</p>
            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-75 transition-colors"
                >
                    취소
                </button>
                <button
                    onClick={onConfirm}
                    className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition-colors"
                >
                    확인
                </button>
            </div>
        </div>
    </div>
);


const App: React.FC = () => {
  const [cells, setCells] = useState<string[][]>(() =>
    Array(9).fill(null).map(() => Array(9).fill(''))
  );
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleCellChange = useCallback((row: number, col: number, value: string) => {
    setCells(prevCells => {
      const newCells = prevCells.map(r => [...r]);
      newCells[row][col] = value;

      const sourceKey = `${row},${col}`;
      if (SYNC_MAP[sourceKey]) {
        const [targetRow, targetCol] = SYNC_MAP[sourceKey];
        newCells[targetRow][targetCol] = value;
      }

      return newCells;
    });
  }, []);

  const handleReset = useCallback(() => {
    setConfirmation({
        title: '계획표 초기화',
        message: '정말 모든 내용을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
        onConfirm: () => {
            setCells(Array(9).fill(null).map(() => Array(9).fill('')));
            setNotification({ message: '모든 내용이 초기화되었습니다.', type: 'info' });
            setConfirmation(null);
        }
    });
  }, []);

  const handleDownloadImage = useCallback(() => {
    if (!gridRef.current) {
      return;
    }
    toPng(gridRef.current, { 
        cacheBust: true,
        backgroundColor: '#f1f5f9', // Corresponds to Tailwind's bg-slate-100
        pixelRatio: 2
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'mandalart-plan.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('oops, something went wrong!', err);
        setNotification({ message: '이미지 저장에 실패했습니다.', type: 'error' });
      });
  }, []);

  const handleSave = useCallback(() => {
    const code = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    try {
      localStorage.setItem(`mandalart_${code}`, JSON.stringify(cells));
      setSavedCode(code);
    } catch (error) {
      console.error("Save failed:", error);
      setNotification({ message: "저장에 실패했습니다. 브라우저 저장 공간이 부족할 수 있습니다.", type: 'error' });
    }
  }, [cells]);

  const handleLoad = useCallback((code: string) => {
    if (!/^\d{12}$/.test(code)) {
        setNotification({ message: "12자리 숫자 코드를 입력해주세요.", type: 'error' });
        return;
    }
    const savedData = localStorage.getItem(`mandalart_${code}`);
    if (savedData) {
        setConfirmation({
            title: '계획표 불러오기',
            message: '불러오면 현재 작성된 내용이 사라집니다. 계속하시겠습니까?',
            onConfirm: () => {
                try {
                    const loadedCells = JSON.parse(savedData);
                    if (Array.isArray(loadedCells) && loadedCells.length === 9 && Array.isArray(loadedCells[0]) && loadedCells[0].length === 9) {
                        setCells(loadedCells);
                        setNotification({ message: '성공적으로 불러왔습니다.', type: 'success' });
                    } else {
                        throw new Error("Invalid data format");
                    }
                } catch (error) {
                    console.error("Load failed:", error);
                    setNotification({ message: "데이터를 불러오는 중 오류가 발생했습니다.", type: 'error' });
                }
                setConfirmation(null);
            }
        });
    } else {
        setNotification({ message: "유효하지 않은 코드이거나 저장된 데이터가 없습니다.", type: 'error' });
    }
  }, []);


  const getCellStyling = (row: number, col: number) => {
    const isCenterBlock = row >= 3 && row <= 5 && col >= 3 && col <= 5;
    
    let wrapperClasses = 'grid place-items-center p-1';
    let textareaClasses = 'w-full max-h-full resize-none bg-transparent focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-sm text-center overflow-auto font-sans text-sm transition-shadow duration-200';
    let readOnly = false;
    let placeholder = '';

    if (isCenterBlock) {
        if (row === 4 && col === 4) {
            wrapperClasses += ' bg-yellow-200';
            textareaClasses += ' text-red-600 font-bold placeholder-red-400/70 text-base';
            placeholder = '핵심 목표';
        } else {
            // Sub-goal cell in the center block. Find its corresponding outer grid style.
            const sourceKey = `${row},${col}`;
            const targetCoords = SYNC_MAP[sourceKey];
            if(targetCoords) {
                const gridRow = Math.floor(targetCoords[0] / 3);
                const gridCol = Math.floor(targetCoords[1] / 3);
                const style = OUTER_GRID_STYLES[`${gridRow},${gridCol}`];

                if(style) {
                    // Set the background color to match the outer grid's center cell.
                    wrapperClasses += ` ${style.center}`;
                    // Set a standard dark text color for readability, as requested.
                    textareaClasses += ` text-slate-800 font-semibold placeholder-slate-500/70`;
                }
            }
            placeholder = '세부 목표';
        }
    } else { // Outer blocks
        const gridRow = Math.floor(row / 3);
        const gridCol = Math.floor(col / 3);
        const style = OUTER_GRID_STYLES[`${gridRow},${gridCol}`];

        if (style) {
            if (row % 3 === 1 && col % 3 === 1) { // Center of an outer block
                wrapperClasses += ` ${style.center}`;
                // This cell is linked from the center, so it shares the same background.
                // Text color is standardized for readability.
                textareaClasses += ` text-slate-800 font-semibold cursor-not-allowed`;
                readOnly = true;
            } else { // Action plan cells in outer blocks
                wrapperClasses += ` ${style.base}`;
                // Standard dark text color for all action plan cells.
                textareaClasses += ' text-slate-800 placeholder-slate-400/80';
                placeholder = '실행 계획';
            }
        }
    }

    // Default thin border
    wrapperClasses += ' border border-slate-200';
    
    // Major grid lines override the thin border where applicable
    if (row > 0 && row % 3 === 0) wrapperClasses += ' border-t-2 border-t-slate-400';
    if (col > 0 && col % 3 === 0) wrapperClasses += ' border-l-2 border-l-slate-400';

    return { wrapperClasses, textareaClasses, readOnly, placeholder };
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 lg:p-8 font-['Noto_Sans_KR']">
      {notification && (
        <Notification 
            message={notification.message}
            type={notification.type}
            onDismiss={() => setNotification(null)}
        />
      )}
      {savedCode && <SaveCodeModal code={savedCode} onClose={() => setSavedCode(null)} />}
      {confirmation && (
        <ConfirmationModal
            title={confirmation.title}
            message={confirmation.message}
            onConfirm={confirmation.onConfirm}
            onCancel={() => setConfirmation(null)}
        />
      )}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
        <Header />
        <Controls 
            onReset={handleReset} 
            onDownload={handleDownloadImage}
            onSave={handleSave}
            onLoad={handleLoad}
        />
        <div 
          ref={gridRef}
          className="grid grid-cols-9 grid-rows-9 aspect-square w-full shadow-2xl rounded-lg overflow-hidden border-2 border-slate-400"
          style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
        >
          {cells.map((rowArr, rowIndex) =>
            rowArr.map((cellValue, colIndex) => {
              const { wrapperClasses, textareaClasses, readOnly, placeholder } = getCellStyling(rowIndex, colIndex);
              return (
                <div 
                  key={`${rowIndex}-${colIndex}`} 
                  className={wrapperClasses}
                >
                  <CellTextarea
                    value={cellValue}
                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                    readOnly={readOnly}
                    placeholder={placeholder}
                    className={textareaClasses}
                    aria-label={`Cell ${rowIndex+1}-${colIndex+1}`}
                    rows={1}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
