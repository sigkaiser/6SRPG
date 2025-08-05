import React from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useGlobalState } from '../context/GlobalState';

import pageBackground from '../assets/page.png';

const Page = React.forwardRef((props, ref) => {
    return (
        <div
            className="page"
            ref={ref}
            style={{
                backgroundImage: `url(${pageBackground})`,
                backgroundSize: 'cover',
                border: '1px solid #c9b49a',
                padding: '20px'
            }}
        >
            <div className="page-content">
                <div className="page-text">{props.children}</div>
                <div className="page-footer" style={{textAlign: 'center', paddingTop: '10px'}}>{props.number}</div>
            </div>
        </div>
    );
});

const ExerciseHistory = () => {
    const { currentUser } = useGlobalState();
    if (!currentUser) return <p className="text-center text-gray-400">Please login to view history.</p>;
    const { exerciseHistory } = currentUser;

    if (!exerciseHistory || exerciseHistory.length === 0) {
        return (
            <div>
                <h3 className="text-2xl font-bold text-center text-yellow-400 mb-4">Exercise History</h3>
                <p className="text-center text-gray-300">No exercises logged yet. Time to get to work!</p>
            </div>
        );
    }
    const sortedHistory = [...exerciseHistory].sort((a, b) => (b.date ? new Date(b.date) : 0) - (a.date ? new Date(a.date) : 0));

    return (
        <div className="w-full max-w-sm p-1 flex justify-center">
            <HTMLFlipBook width={300} height={500} size="stretch" usePortrait={true}>
                <div className="page" style={{ backgroundColor: '#a56a2a', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                    Exercise Log
                </div>
                {Array.from({ length: Math.ceil(sortedHistory.length / 3) }).map((_, pageIndex) => (
                    <Page key={pageIndex} number={pageIndex + 1}>
                        {sortedHistory.slice(pageIndex * 3, pageIndex * 3 + 3).map((entry, entryIndex) => (
                            <div key={entry._id || entryIndex} className="p-1 rounded-md shadow text-xs mb-2">
                                <p className="font-semibold text-yellow-800">
                                    {entry.type || 'N/A'} - {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}
                                </p>
                                <div className="pl-2">
                                    {entry.category === 'Lift' && entry.sets && entry.sets.map((set, sIndex) => (
                                        <p key={sIndex}>Set {sIndex + 1}: {set.reps} reps at {set.weight} lbs</p>
                                    ))}
                                    {entry.category === 'Stretch' && entry.sets && entry.sets.map((set, sIndex) => (
                                        <p key={sIndex}>Set {sIndex + 1}: {set.duration} seconds</p>
                                    ))}
                                    {entry.category === 'Cardio' && (
                                        <p>Duration: {entry.duration} minutes {entry.intensity ? `at intensity ${entry.intensity}` : ''}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </Page>
                ))}
                <div className="page" style={{ backgroundColor: '#a56a2a', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                    The End
                </div>
            </HTMLFlipBook>
        </div>
    );
};
export default ExerciseHistory;
