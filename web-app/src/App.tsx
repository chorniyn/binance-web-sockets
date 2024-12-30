import './App.css'
import {OptionRow, useBinanceOptionsStream} from "./useBinanceOptionsStream.ts";
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import React from "react";

const callsColumns = 4
const putColumns = 4

function App() {
    const data = useBinanceOptionsStream()
    return <div>
        <Typography variant={'h4'}>BTCUSDT: {data.indexPrice?.toFixed(1)}</Typography>
        {data.data.map(({optionsData, maturityDate}, index) => <Box key={index} mt={2}>
                <Typography variant={'h6'}>{maturityDate.toLocaleDateString()}</Typography>
                <TableContainer component={Paper}>
                    <Table sx={{minWidth: 650, '& td': {paddingTop: '2px', paddingBottom: '2px'}}} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell colSpan={callsColumns}>Calls</TableCell>
                                <TableCell>Date</TableCell>
                                <TableCell colSpan={putColumns}>Puts</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Delta</TableCell>
                                <TableCell>Bid Size</TableCell>
                                <TableCell>Bid / IV</TableCell>
                                <TableCell>Mark</TableCell>
                                <TableCell>Strike</TableCell>
                                <TableCell>Mark</TableCell>
                                <TableCell>Ask / IV</TableCell>
                                <TableCell>Ask Size</TableCell>
                                <TableCell>Delta</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <OptionsData optionsData={optionsData} indexPrice={data.indexPrice}/>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        )}
    </div>
}

const OptionsData = ({optionsData, indexPrice}: { optionsData?: OptionRow[], indexPrice?: number }) => {
    let previousRow: OptionRow | undefined = undefined
    let borderDrawn = false
    const rows: React.ReactNode[] = []
    optionsData?.forEach((row, index) => {
        const shouldDrawTopBorder = !borderDrawn && (indexPrice === undefined || previousRow === undefined ? false : row.strikePrice > indexPrice)
        if (shouldDrawTopBorder) {
            borderDrawn = true
        }
        previousRow = row
        if (shouldDrawTopBorder) {
            rows.push(<TableRow key={'priceBreakRow'} sx={{textAlign: 'center', '& > td': {border: '1px solid red'}}}>
                <TableCell colSpan={callsColumns + putColumns + 1} sx={{textAlign: 'center'}}>
                    {indexPrice?.toFixed(1)}
                </TableCell>
            </TableRow>)
        }
        rows.push(<TableRow
                key={index}
            >
                <TableCell>{row.call?.delta?.toFixed(5)}</TableCell>
                <TableCell>{row.call?.bestBuyQuantity?.toFixed(2)}</TableCell>
                <TableCell>
                    {row.call?.bestBuyPrice?.toFixed(1)}<br/>
                    {((row.call?.buyImpliedVolatility ?? 0) * 100)?.toFixed(2)}%
                </TableCell>
                <TableCell>{row.call?.markPrice}</TableCell>
                <TableCell>{row.strikePrice}</TableCell>
                <TableCell>{row.put?.markPrice}</TableCell>
                <TableCell>
                    {row.put?.bestSellPrice?.toFixed(1)}<br/>
                    {((row.put?.sellImpliedVolatility ?? 0) * 100)?.toFixed(2)}%
                </TableCell>
                <TableCell>{row.put?.bestCellQuantity}</TableCell>
                <TableCell>{row.put?.delta?.toFixed(5)}</TableCell>
            </TableRow>
        )
    })
    return rows
}

export default App
