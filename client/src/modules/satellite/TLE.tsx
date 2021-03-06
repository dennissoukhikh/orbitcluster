import { tle } from '../../types/satellite';

interface TLEProps {
    tles: Array<tle>,
    setActiveTle: Function
}

export const TLE: React.FC<TLEProps> = ({ tles, setActiveTle }) => {
    return (
        <div className="mt-5 w-max">
            {tles.map((tle, index) => {
                return (
                    <div key={index}>
                        <div className="mt-5 border-l border-solid border-primary-800 text-sm font-light">
                            <div style={{ letterSpacing: '.5px', lineHeight: '1.5rem' }} className="whitespace-pre font-mono pl-3">
                                <div>{tle.tle_line0}</div>
                                <div>{tle.tle_line1}</div>
                                <div>{tle.tle_line2}</div>
                            </div>
                        </div>
                        <div className="text-sm pt-1 flex justify-between">
                            <p className="text-primary-200">{tle.source}</p>
                            <p className="cursor-pointer text-primary-700" onClick={() => setActiveTle(tle)}>Set Active</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
