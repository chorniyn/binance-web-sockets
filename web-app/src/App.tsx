import './App.css'
import {useBinanceOptionsStream} from "./useBinanceOptionsStream.ts";
import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";

function App() {
    const optionsData = useBinanceOptionsStream()
    return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableHead>
                    <TableRow>
                        <TableCell colSpan={2}>Calls</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell colSpan={4}>Puts</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Delta</TableCell>
                        <TableCell>Mark</TableCell>
                        <TableCell>Strike</TableCell>
                        <TableCell>Mark</TableCell>
                        <TableCell>Ask / IV</TableCell>
                        <TableCell>Ask Size</TableCell>
                        <TableCell>Delta</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {optionsData.map((row, index) => (
                        <TableRow
                            key={index}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                            <TableCell>{row.call?.delta?.toFixed(5)}</TableCell>
                            <TableCell>{row.call?.markPrice}</TableCell>
                            <TableCell>{row.strikePrice}</TableCell>
                            <TableCell>{row.put?.markPrice}</TableCell>
                            <TableCell>
                                {row.put?.bestCellPrice?.toFixed(1)}<br/>
                                {((row.put?.sellImpliedVolatility ?? 0) * 100)?.toFixed(2)}%
                            </TableCell>
                            <TableCell>{row.put?.bestCellQuantity}</TableCell>
                            <TableCell>{row.put?.delta?.toFixed(5)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
)
}

export default App
