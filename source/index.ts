import speedTest, { ResultEvent } from 'speedtest-net'
import ping, { PingResponse } from 'ping'
import fs from 'fs'
import filesize from 'filesize'

const file = `${__dirname}/../logs/${new Date().toISOString()}.ndjson`
const logs = fs.createWriteStream(file, { flags: 'a+' })

const PING_ADDRESSES = ['1.1.1.1', '8.8.8.8', '95.216.19.251']
const DOWNLOAD_IN_BYTES = 125 * 1000 * 1000
const UPLOAD_IN_BYTES = 6.25 * 1000 * 1000

type Result = {
	data: any
	isSuccessful: boolean
	summary: string
	time: string
	type: 'ping' | 'speedtest'
}

const logResult = (
	type: Result['type'],
	isSuccessful: Result['isSuccessful'],
	summary: Result['summary'],
	data: any
) => {
	const time = new Date().toISOString()
	const result: Result = {
		time,
		type,
		summary,
		isSuccessful,
		data,
	}
	logs.write(JSON.stringify(result) + '\n')
}

const summarizePing = (results: Array<PingResponse>): string => {
	const failed = results.filter((r) => !r.alive).length

	const average =
		failed !== 0
			? null
			: results.reduce((a, b) => a + (b.time as number), 0) / results.length

	return average === null ? `${failed} failed` : `${average.toFixed(2)}ms`
}

const testPing = async () => {
	try {
		const results = await Promise.all(
			PING_ADDRESSES.map((address) =>
				ping.promise.probe(address, { timeout: 60000 })
			)
		)
		logResult(
			'ping',
			results.every((r) => r.alive),
			summarizePing(results),
			results
		)
	} catch (err) {
		logResult('ping', false, 'failed', err.message)
	}
}

const summarizeSpeed = (result: ResultEvent): string => {
	return `${result.download.bandwidth / DOWNLOAD_IN_BYTES}% ${
		result.upload.bandwidth / UPLOAD_IN_BYTES
	}% ${result.ping.latency}ms`
}

const testSpeed = async () => {
	try {
		const result = await speedTest()
		logResult('speedtest', true, summarizeSpeed(result), result)
	} catch (err) {
		logResult('speedtest', false, 'failed', err.message)
	}
}

let loop = 0

const run = async () => {
	const currentLoop = loop++
	console.log(`loop ${currentLoop}`)
	if (currentLoop % 600 === 0) await testSpeed()
	else await testPing()
}

setInterval(run, 1000)
