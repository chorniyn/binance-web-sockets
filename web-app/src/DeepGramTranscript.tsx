import {useCallback, useEffect, useMemo, useState} from "react";
import {useDropzone} from 'react-dropzone'
import {Box, Button, Dialog, DialogContent, DialogTitle, Stack} from "@mui/material";

type Deepgram = {
    results: {
        channels: Array<{
            alternatives: Array<{
                transcript: string,
                words: Array<{
                    start: number,
                    end: number,
                    speaker: number
                }>
                summaries: Array<{
                    summary: string
                }>
                topics: Array<{
                    topics: Array<{ topic: string }>
                }>
            }>
        }>
    }
}

function extractSummary(json: Deepgram) {
    let summary = "";
    const summaryData = json.results.channels[0].alternatives[0].summaries;

    summaryData?.forEach((element, index) => {
        summary += element.summary;
        if (index < summaryData.length - 1) {
            summary += "\n\n";
        }
    });

    return (summary);
}

function extractTopics(json: Deepgram) {
    const topics: string[] = [];
    const topicsData = json.results.channels[0].alternatives[0].topics;

    topicsData.forEach(element => {
        element.topics.forEach(el => {
            topics.push(el.topic);
        });
    });

    return (topics);
}

function parseData(json: Deepgram) {

    const maxWordsInPara = 100;
    const significantGapInSeconds = 0.5;

    const punctuatedWords = json.results.channels[0].alternatives[0].transcript.split(' ');
    const wordData = json.results.channels[0].alternatives[0].words;

    let hyperTranscript = `<article><section data-media-src="/nds-1-with-1-channel.mp3" data-media-type="audio/mp3" data-wm="$ilp.uphold.com/123section">  <p> `;

    let previousElementEnd = 0;
    let wordsInPara = 0;
    const showDiarization = true;

    const wordsPerSpeker: Record<number, number> = {}
    wordData.forEach((element, index) => {

        const currentWord = punctuatedWords[index];
        wordsInPara++;

        // if there's a gap longer than half a second consider splitting into new para

        if (previousElementEnd !== 0 && (element.start - previousElementEnd) > significantGapInSeconds || wordsInPara > maxWordsInPara) {
            const previousWord = punctuatedWords[index - 1];
            const previousWordLastChar = previousWord.charAt(previousWord.length - 1);
            if (previousWordLastChar === "." || previousWordLastChar === "?" || previousWordLastChar === "!") {
                hyperTranscript += "\n  </p>\n  <p>\n   ";
                wordsInPara = 0;
            }
        }

        // change of speaker or first word
        if ((showDiarization === true && index > 0 && element.speaker !== wordData[index - 1].speaker) || index === 0) {
            const previousWord = punctuatedWords[index - 1];
            let previousWordLastChar = null;

            if (index > 0) {
                previousWordLastChar = previousWord.charAt(previousWord.length - 1);
            }

            if (index > 0 && (previousWordLastChar === "." || previousWordLastChar === "?" || previousWordLastChar === "!")) {
                hyperTranscript += "\n  </p>\n  <p>\n   ";
                wordsInPara = 0;
            }
            wordsPerSpeker[element.speaker] = (wordsPerSpeker[element.speaker] ?? 0) + 1;
            hyperTranscript += `<span class="speaker" data-m="${parseFloat(element.start.toFixed(2))! * 1000}" data-d='0'>[Speaker-${element.speaker + 1}] </span>`;
        }

        hyperTranscript += `<span data-m="${parseFloat(element.start.toFixed(2)) * 1000}" data-d="${parseFloat((element.end - element.start).toFixed(2)) * 1000}">${currentWord} </span>`;

        previousElementEnd = element.end;
    });

    hyperTranscript += "\n </p> \n </section>\n</article>\n ";
    const [officer, participant] = Object.entries(wordsPerSpeker).sort(([, words1], [, words2]) => words2 - words1)
    let res = hyperTranscript
    if (officer) {
        res = res.replace(new RegExp(`Speaker-${parseInt(officer[0]) + 1}`, 'g'), "Officer")
    }
    if (participant) {
        res = res.replace(new RegExp(`Speaker-${parseInt(participant[0]) + 1}`, 'g'), "Participant")
    }
    return res;

}

export const DeepgramToHypertranscript = () => {
    const [videoSrc, setVideoSrc] = useState<string>();

    const onVideoDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            const videoURL = URL.createObjectURL(file);
            setVideoSrc((prev) => {
                if (prev) {
                    URL.revokeObjectURL(prev)
                }
                return videoURL
            });
        }
    }, []);

    const {getRootProps, getInputProps, isDragActive} = useDropzone({
        onDrop: onVideoDrop,
        multiple: false,
    });

    const [transcript, setTranscript] = useState<Deepgram>();
    const summary = useMemo(() => transcript ? extractSummary(transcript) : undefined, [transcript])

    const onTranscriptDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            (async () => {
                setTranscript(JSON.parse(await file.text()))
            })()

        }
    }, []);

    const transcriptProps = useDropzone({
        onDrop: onTranscriptDrop,
        multiple: false,
    });
    const [showSummary, setShowSummary] = useState(false);
    return (<div>
            <Stack flexDirection={'row'} alignItems={'center'} justifyContent={'center'} gap={1}>
                <Box flex={0}>
                    <div style={{border: `2px solid grey`, background: isDragActive? 'blueviolet' :'white', cursor: 'pointer', width: 700, height: 120, display: "flex", justifyContent: "center", alignItems: "center"}}
                         {...getRootProps()}
                    >
                        <input {...getInputProps()} />
                        <p style={{fontSize: 20, fontWeight: 'bold', color: isDragActive ? 'white' : 'black' }}>Recording</p>
                    </div>
                    <div style={{border: `2px solid grey`, marginTop: 8, marginBottom: 8, background: transcriptProps.isDragActive? 'blueviolet' :'white', cursor: 'pointer', width: 700, height: 130, display: "flex", justifyContent: "center", alignItems: "center"}}
                         {...transcriptProps.getRootProps()}
                    >
                        <input {...transcriptProps.getInputProps()} />
                        <p style={{fontSize: 20, fontWeight: 'bold', color: transcriptProps.isDragActive ? 'white' : 'black' }}>Transcript</p>
                    </div>
                    <video id="hyperplayer" className="hyperaudio-player"
                           style={{zIndex: 5000000, position: "relative", width: 702}}
                           src={videoSrc} controls>
                        <track id="hyperplayer-vtt" label="English" kind="subtitles" srcLang="en" src=""/>
                    </video>
                    {(transcript && summary) && <Button onClick={() => setShowSummary(true)}>Show Summary</Button>}
                </Box>
                <Box flex={1}>
                    <DeepgramToHypertranscriptDisplay transcript={transcript}/>
                </Box>
                {(transcript && summary) && <Dialog open={showSummary} onClose={() => setShowSummary(false)}>
                    <DialogTitle>Summary</DialogTitle>
                    <DialogContent>
                        <pre style={{wordBreak: 'break-word', textWrap: 'auto'}}>{summary}</pre>
                    </DialogContent>
                </Dialog>}
            </Stack>
        </div>
    )
}
export const DeepgramToHypertranscriptDisplay = ({transcript}: { transcript?: Deepgram }) => {
    useEffect(() => {
        if (transcript) {
            const minimizedMode = false;
            const autoScroll = true;
            const doubleClick = false;
            const webMonetization = true;
            const playOnClick = false;
            new (window as unknown as any).HyperaudioLite("hypertranscript", "hyperplayer", minimizedMode, autoScroll, doubleClick, webMonetization, playOnClick);

            // Override scroll parameters
            //ht1.setScrollParameters(<duration>, <delay>, <offset>, <container>);

            // this should create captions
            const c = (window as any).caption
            const cap1 = c();
            cap1.init("hypertranscript", "hyperplayer", '37', '21'); // transcript Id, player Id, max chars, min chars for caption line
        }
    }, [transcript])
    return (<div id="hypertranscript" className="hyperaudio-transcript"
                 dangerouslySetInnerHTML={{__html: transcript ? parseData(transcript) : ''}}
                 style={{
                     overflowY: 'scroll',
                     height: '95vh',
                     position: 'relative',
                     borderStyle: 'dashed',
                     borderWidth: 1,
                     borderColor: '#999',
                     padding: 8
                 }}>
        </div>

    );
};
