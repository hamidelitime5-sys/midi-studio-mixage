// SoundFont 2 (SF2) RIFF Specification Parser & Sample Extraction Engine
// Conforms to SoundFont 2.04 Specification: phdr -> pbag -> pgen -> inst -> ibag -> igen -> shdr -> smpl

export interface Sf2PresetInfo {
  name: string;
  program: number; // 0-127
  bank: number; // 0-128
}

export interface Sf2SampleHeader {
  name: string;
  start: number;
  end: number;
  startLoop: number;
  endLoop: number;
  sampleRate: number;
  originalKey: number;
  pitchCorrection: number;
  sampleType: number;
}

export interface Sf2DecodedSampleZone {
  buffer: AudioBuffer;
  rootKey: number;
  lowKey: number;
  highKey: number;
  loopStart: number;
  loopEnd: number;
  isLooping: boolean;
  sampleRate: number;
  name: string;
}

export interface Sf2Metadata {
  bankName: string;
  fileSize: number;
  presets: Sf2PresetInfo[];
  rawBuffer?: ArrayBuffer;
  smplOffset?: number;
  smplLength?: number;
  sampleHeaders?: Sf2SampleHeader[];

  // SoundFont 2 Structural Linking Tables
  presetEntries?: { name: string; program: number; bank: number; bagIndex: number }[];
  pbagGenIndices?: number[];
  pgenList?: { op: number; amount: number }[];
  instBagIndices?: number[];
  ibagGenIndices?: number[];
  igenList?: { op: number; amount: number }[];
}

export function parseSf2Header(buffer: ArrayBuffer): Sf2Metadata {
  const dataView = new DataView(buffer);
  const fileSize = buffer.byteLength;
  let bankName = 'SoundFont Bank';
  const presets: Sf2PresetInfo[] = [];

  let smplOffset = 0;
  let smplLength = 0;
  const sampleHeaders: Sf2SampleHeader[] = [];

  const presetEntries: { name: string; program: number; bank: number; bagIndex: number }[] = [];
  const pbagGenIndices: number[] = [];
  const pgenList: { op: number; amount: number }[] = [];
  const instBagIndices: number[] = [];
  const ibagGenIndices: number[] = [];
  const igenList: { op: number; amount: number }[] = [];

  try {
    // Check RIFF header
    const riff = getString(dataView, 0, 4);
    if (riff !== 'RIFF') {
      return { bankName: 'SoundFont (SF2)', fileSize, presets: [] };
    }

    const format = getString(dataView, 8, 4);
    if (format !== 'sfbk') {
      return { bankName: 'SoundFont (SF2)', fileSize, presets: [] };
    }

    let offset = 12;
    while (offset + 8 < fileSize) {
      const chunkId = getString(dataView, offset, 4);
      const chunkSize = dataView.getUint32(offset + 4, true);
      const chunkDataOffset = offset + 8;

      if (chunkId === 'LIST') {
        const listType = getString(dataView, chunkDataOffset, 4);

        // INFO List: Bank Name
        if (listType === 'INFO') {
          let infoOffset = chunkDataOffset + 4;
          const infoEnd = Math.min(fileSize, chunkDataOffset + chunkSize);
          while (infoOffset + 8 < infoEnd) {
            const subId = getString(dataView, infoOffset, 4);
            const subSize = dataView.getUint32(infoOffset + 4, true);
            if (subId === 'INAM') {
              bankName = getString(dataView, infoOffset + 8, Math.min(subSize, 64)).replace(/\0/g, '').trim();
            }
            infoOffset += 8 + subSize + (subSize % 2);
          }
        }

        // sdta List: smpl 16-bit PCM Audio Data
        if (listType === 'sdta') {
          let sdtaOffset = chunkDataOffset + 4;
          const sdtaEnd = Math.min(fileSize, chunkDataOffset + chunkSize);
          while (sdtaOffset + 8 < sdtaEnd) {
            const subId = getString(dataView, sdtaOffset, 4);
            const subSize = dataView.getUint32(sdtaOffset + 4, true);
            if (subId === 'smpl') {
              smplOffset = sdtaOffset + 8;
              smplLength = subSize;
            }
            sdtaOffset += 8 + subSize + (subSize % 2);
          }
        }

        // pdta List: Presets, Instruments, and Sample Headers
        if (listType === 'pdta') {
          let pdtaOffset = chunkDataOffset + 4;
          const pdtaEnd = Math.min(fileSize, chunkDataOffset + chunkSize);
          while (pdtaOffset + 8 < pdtaEnd) {
            const subId = getString(dataView, pdtaOffset, 4);
            const subSize = dataView.getUint32(pdtaOffset + 4, true);
            const subData = pdtaOffset + 8;

            if (subId === 'phdr') {
              // Preset headers (38 bytes each)
              const presetCount = Math.floor(subSize / 38);
              for (let p = 0; p < presetCount; p++) {
                const pOffset = subData + p * 38;
                const pName = getString(dataView, pOffset, 20).replace(/\0/g, '').trim();
                const program = dataView.getUint16(pOffset + 20, true);
                const bank = dataView.getUint16(pOffset + 22, true);
                const bagNdx = dataView.getUint16(pOffset + 24, true);
                if (pName && pName !== 'EOP') {
                  presets.push({ name: pName, program, bank });
                }
                presetEntries.push({ name: pName, program, bank, bagIndex: bagNdx });
              }
            } else if (subId === 'pbag') {
              // Preset zone index into pgen (4 bytes each)
              const count = Math.floor(subSize / 4);
              for (let i = 0; i < count; i++) {
                pbagGenIndices.push(dataView.getUint16(subData + i * 4, true));
              }
            } else if (subId === 'pgen') {
              // Preset generators (4 bytes each: 2 bytes op, 2 bytes amount)
              const count = Math.floor(subSize / 4);
              for (let i = 0; i < count; i++) {
                pgenList.push({
                  op: dataView.getUint16(subData + i * 4, true),
                  amount: dataView.getUint16(subData + i * 4 + 2, true),
                });
              }
            } else if (subId === 'inst') {
              // Instrument headers (22 bytes each, bagNdx at offset 20)
              const count = Math.floor(subSize / 22);
              for (let i = 0; i < count; i++) {
                instBagIndices.push(dataView.getUint16(subData + i * 22 + 20, true));
              }
            } else if (subId === 'ibag') {
              // Instrument zone index into igen (4 bytes each)
              const count = Math.floor(subSize / 4);
              for (let i = 0; i < count; i++) {
                ibagGenIndices.push(dataView.getUint16(subData + i * 4, true));
              }
            } else if (subId === 'igen') {
              // Instrument generators (4 bytes each: 2 bytes op, 2 bytes amount)
              const count = Math.floor(subSize / 4);
              for (let i = 0; i < count; i++) {
                igenList.push({
                  op: dataView.getUint16(subData + i * 4, true),
                  amount: dataView.getUint16(subData + i * 4 + 2, true),
                });
              }
            } else if (subId === 'shdr') {
              // Sample headers (46 bytes per record)
              const count = Math.floor(subSize / 46);
              for (let i = 0; i < count; i++) {
                const sOffset = subData + i * 46;
                const sName = getString(dataView, sOffset, 20).replace(/\0/g, '').trim();
                const start = dataView.getUint32(sOffset + 20, true);
                const end = dataView.getUint32(sOffset + 24, true);
                const startLoop = dataView.getUint32(sOffset + 28, true);
                const endLoop = dataView.getUint32(sOffset + 32, true);
                const sampleRate = dataView.getUint32(sOffset + 36, true);
                const originalKey = dataView.getUint8(sOffset + 40);
                const pitchCorrection = dataView.getInt8(sOffset + 41);
                const sampleType = dataView.getUint16(sOffset + 44, true);

                sampleHeaders.push({
                  name: sName,
                  start,
                  end,
                  startLoop,
                  endLoop,
                  sampleRate: sampleRate || 44100,
                  originalKey: originalKey || 60,
                  pitchCorrection,
                  sampleType,
                });
              }
            }
            pdtaOffset += 8 + subSize + (subSize % 2);
          }
        }
      }

      offset += 8 + chunkSize + (chunkSize % 2);
    }
  } catch (err) {
    console.warn('SF2 parsing warning:', err);
  }

  return {
    bankName: bankName || 'Custom SF2 Bank',
    fileSize,
    presets,
    rawBuffer: buffer,
    smplOffset,
    smplLength,
    sampleHeaders,
    presetEntries,
    pbagGenIndices,
    pgenList,
    instBagIndices,
    ibagGenIndices,
    igenList,
  };
}

/**
 * Decode authentic AudioBuffers for a specific preset using full SoundFont 2 generator traversal
 */
export function decodeSf2PresetSamples(
  sf2Meta: Sf2Metadata,
  bank: number,
  program: number,
  audioCtx: AudioContext
): Sf2DecodedSampleZone[] {
  if (!sf2Meta.rawBuffer || !sf2Meta.smplOffset || !sf2Meta.sampleHeaders || sf2Meta.sampleHeaders.length === 0) {
    return [];
  }

  const results: Sf2DecodedSampleZone[] = [];
  const buffer = sf2Meta.rawBuffer;
  const smplOffset = sf2Meta.smplOffset;
  const smplByteLength = sf2Meta.smplLength || buffer.byteLength - smplOffset;
  const totalWords = Math.floor(smplByteLength / 2);

  // 1. Traverse generator tables if available (Standard SF2 Spec)
  if (
    sf2Meta.presetEntries &&
    sf2Meta.pbagGenIndices &&
    sf2Meta.pgenList &&
    sf2Meta.instBagIndices &&
    sf2Meta.ibagGenIndices &&
    sf2Meta.igenList
  ) {
    // Find preset entry matching bank & program
    let pIdx = sf2Meta.presetEntries.findIndex((p) => p.bank === bank && p.program === program);

    // Fallbacks if exact (bank, program) not found
    if (pIdx === -1) {
      if (bank === 128) {
        pIdx = sf2Meta.presetEntries.findIndex((p) => p.bank === 128 || p.name.toLowerCase().includes('drum'));
      } else {
        pIdx = sf2Meta.presetEntries.findIndex((p) => p.program === program && p.bank === 0);
        if (pIdx === -1) {
          pIdx = sf2Meta.presetEntries.findIndex((p) => p.program === program);
        }
      }
    }

    if (pIdx !== -1 && pIdx < sf2Meta.presetEntries.length - 1) {
      const startPBag = sf2Meta.presetEntries[pIdx].bagIndex;
      const endPBag = sf2Meta.presetEntries[pIdx + 1]?.bagIndex ?? sf2Meta.pbagGenIndices.length;

      const sampleZonesToDecode: {
        sampleID: number;
        lowKey: number;
        highKey: number;
        rootKey?: number;
        isLooping?: boolean;
      }[] = [];

      // Loop through preset bags
      for (let pb = startPBag; pb < endPBag; pb++) {
        const startPGen = sf2Meta.pbagGenIndices[pb];
        const endPGen = sf2Meta.pbagGenIndices[pb + 1] ?? sf2Meta.pgenList.length;

        let instIdx: number | null = null;
        for (let pg = startPGen; pg < endPGen; pg++) {
          const gen = sf2Meta.pgenList[pg];
          if (gen && gen.op === 41) {
            // op 41 = instrument
            instIdx = gen.amount;
            break;
          }
        }

        if (instIdx !== null && instIdx < sf2Meta.instBagIndices.length) {
          const startIBag = sf2Meta.instBagIndices[instIdx];
          const endIBag = sf2Meta.instBagIndices[instIdx + 1] ?? sf2Meta.ibagGenIndices.length;

          // Loop through instrument bags
          for (let ib = startIBag; ib < endIBag; ib++) {
            const startIGen = sf2Meta.ibagGenIndices[ib];
            const endIGen = sf2Meta.ibagGenIndices[ib + 1] ?? sf2Meta.igenList.length;

            let sampleID: number | null = null;
            let lowKey = 0;
            let highKey = 127;
            let rootKey: number | undefined;
            let isLooping: boolean | undefined;

            for (let ig = startIGen; ig < endIGen; ig++) {
              const gen = sf2Meta.igenList[ig];
              if (!gen) continue;
              if (gen.op === 53) {
                // op 53 = sampleID
                sampleID = gen.amount;
              } else if (gen.op === 43) {
                // op 43 = keyRange
                lowKey = gen.amount & 0xff;
                highKey = (gen.amount >> 8) & 0xff;
              } else if (gen.op === 58) {
                // op 58 = overridingRootKey
                rootKey = gen.amount;
              } else if (gen.op === 54) {
                // op 54 = sampleModes (1 or 3 = loop continuously)
                isLooping = (gen.amount & 1) !== 0;
              }
            }

            if (sampleID !== null && sampleID < sf2Meta.sampleHeaders.length) {
              sampleZonesToDecode.push({ sampleID, lowKey, highKey, rootKey, isLooping });
            }
          }
        }
      }

      // Decode discovered zones (cap at 64 zones per preset to keep memory light and super fast)
      for (const zone of sampleZonesToDecode.slice(0, 64)) {
        const sh = sf2Meta.sampleHeaders[zone.sampleID];
        if (!sh || sh.name === 'EOS') continue;

        const decoded = extractPcmBuffer(
          buffer,
          smplOffset,
          totalWords,
          sh,
          audioCtx,
          zone.rootKey,
          zone.lowKey,
          zone.highKey,
          zone.isLooping
        );
        if (decoded) {
          results.push(decoded);
        }
      }

      if (results.length > 0) {
        return results;
      }
    }
  }

  // 2. Fallback heuristic: match sample header by name or index
  const candidateIndices: number[] = [];
  const targetPreset = sf2Meta.presets.find((p) => p.bank === bank && p.program === program);
  const targetName = (targetPreset?.name || '').toLowerCase();

  sf2Meta.sampleHeaders.forEach((sh, idx) => {
    if (sh.name === 'EOS') return;
    const sName = sh.name.toLowerCase();
    if (targetName && (sName.includes(targetName) || targetName.includes(sName))) {
      candidateIndices.push(idx);
    }
  });

  if (candidateIndices.length === 0) {
    const safeIdx = Math.min(sf2Meta.sampleHeaders.length - 2, Math.max(0, program));
    if (safeIdx >= 0 && sf2Meta.sampleHeaders[safeIdx]) {
      candidateIndices.push(safeIdx);
    }
  }

  candidateIndices.slice(0, 8).forEach((sIdx) => {
    const sh = sf2Meta.sampleHeaders![sIdx];
    if (!sh || sh.name === 'EOS') return;
    const decoded = extractPcmBuffer(buffer, smplOffset, totalWords, sh, audioCtx);
    if (decoded) results.push(decoded);
  });

  return results;
}

function extractPcmBuffer(
  buffer: ArrayBuffer,
  smplOffset: number,
  totalWords: number,
  sh: Sf2SampleHeader,
  audioCtx: AudioContext,
  overrideRootKey?: number,
  lowKey = 0,
  highKey = 127,
  overrideLooping?: boolean
): Sf2DecodedSampleZone | null {
  const startWord = Math.min(totalWords - 1, sh.start);
  const endWord = Math.min(totalWords, Math.max(startWord + 100, sh.end));
  const wordCount = endWord - startWord;
  if (wordCount <= 64) return null;

  try {
    const sampleRate = sh.sampleRate >= 8000 && sh.sampleRate <= 96000 ? sh.sampleRate : 44100;
    const audioBuffer = audioCtx.createBuffer(1, wordCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Read 16-bit signed PCM words from smpl
    const sampleByteOffset = smplOffset + startWord * 2;
    const dataView = new DataView(buffer, sampleByteOffset, wordCount * 2);

    for (let i = 0; i < wordCount; i++) {
      // Normalize 16-bit signed integer to [-1.0, 1.0]
      channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
    }

    const loopStartSec = Math.max(0, (sh.startLoop - sh.start) / sampleRate);
    const loopEndSec = Math.min(wordCount / sampleRate, (sh.endLoop - sh.start) / sampleRate);
    const isLooping = overrideLooping ?? (sh.endLoop > sh.startLoop && loopEndSec > loopStartSec);

    return {
      buffer: audioBuffer,
      rootKey: overrideRootKey ?? (sh.originalKey || 60),
      lowKey,
      highKey,
      loopStart: loopStartSec,
      loopEnd: loopEndSec,
      isLooping,
      sampleRate,
      name: sh.name,
    };
  } catch (e) {
    console.warn('Could not extract SF2 PCM sample:', sh.name, e);
    return null;
  }
}

function getString(dataView: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    if (offset + i >= dataView.byteLength) break;
    const c = dataView.getUint8(offset + i);
    if (c === 0) break;
    str += String.fromCharCode(c);
  }
  return str;
}
