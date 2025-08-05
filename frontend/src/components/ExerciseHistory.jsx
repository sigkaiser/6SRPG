import React from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useGlobalState } from '../context/GlobalState';

const Page = React.forwardRef((props, ref) => {
    return (
        <div className="page" ref={ref} style={{ backgroundColor: '#f3e9d8', border: '1px solid #c9b49a', padding: '20px' }}>
            <div className="page-content">
                <h2 className="page-header">Page {props.number}</h2>
                <div className="page-text">{props.children}</div>
                <div className="page-footer">{props.number}</div>
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
        <div className="w-full max-w-xl p-1 flex justify-center">
            <HTMLFlipBook width={500} height={600} showCover={true}>
                <div className="page" style={{ backgroundColor: '#a56a2a', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                    Exercise Log
                </div>
                {sortedHistory.map((entry, index) => (
                    <Page key={entry._id || index} number={index + 1}>
                        <div className="bg-gray-700 p-3 rounded-md shadow text-sm">
                            <p className="font-semibold text-yellow-300">
                                {entry.type || 'N/A'} - {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}
                            </p>
                            <div className="pl-4">
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
