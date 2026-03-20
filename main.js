var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/qrcode/lib/can-promise.js
var require_can_promise = __commonJS({
  "node_modules/qrcode/lib/can-promise.js"(exports2, module2) {
    module2.exports = function() {
      return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
    };
  }
});

// node_modules/qrcode/lib/core/utils.js
var require_utils = __commonJS({
  "node_modules/qrcode/lib/core/utils.js"(exports2) {
    var toSJISFunction;
    var CODEWORDS_COUNT = [
      0,
      // Not used
      26,
      44,
      70,
      100,
      134,
      172,
      196,
      242,
      292,
      346,
      404,
      466,
      532,
      581,
      655,
      733,
      815,
      901,
      991,
      1085,
      1156,
      1258,
      1364,
      1474,
      1588,
      1706,
      1828,
      1921,
      2051,
      2185,
      2323,
      2465,
      2611,
      2761,
      2876,
      3034,
      3196,
      3362,
      3532,
      3706
    ];
    exports2.getSymbolSize = function getSymbolSize(version) {
      if (!version) throw new Error('"version" cannot be null or undefined');
      if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40');
      return version * 4 + 17;
    };
    exports2.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
      return CODEWORDS_COUNT[version];
    };
    exports2.getBCHDigit = function(data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    };
    exports2.setToSJISFunction = function setToSJISFunction(f) {
      if (typeof f !== "function") {
        throw new Error('"toSJISFunc" is not a valid function.');
      }
      toSJISFunction = f;
    };
    exports2.isKanjiModeEnabled = function() {
      return typeof toSJISFunction !== "undefined";
    };
    exports2.toSJIS = function toSJIS(kanji) {
      return toSJISFunction(kanji);
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-level.js
var require_error_correction_level = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-level.js"(exports2) {
    exports2.L = { bit: 1 };
    exports2.M = { bit: 0 };
    exports2.Q = { bit: 3 };
    exports2.H = { bit: 2 };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "l":
        case "low":
          return exports2.L;
        case "m":
        case "medium":
          return exports2.M;
        case "q":
        case "quartile":
          return exports2.Q;
        case "h":
        case "high":
          return exports2.H;
        default:
          throw new Error("Unknown EC Level: " + string);
      }
    }
    exports2.isValid = function isValid(level) {
      return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
    };
    exports2.from = function from(value, defaultValue) {
      if (exports2.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/bit-buffer.js
var require_bit_buffer = __commonJS({
  "node_modules/qrcode/lib/core/bit-buffer.js"(exports2, module2) {
    function BitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    BitBuffer.prototype = {
      get: function(index) {
        const bufIndex = Math.floor(index / 8);
        return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
      },
      put: function(num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit((num >>> length - i - 1 & 1) === 1);
        }
      },
      getLengthInBits: function() {
        return this.length;
      },
      putBit: function(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }
        if (bit) {
          this.buffer[bufIndex] |= 128 >>> this.length % 8;
        }
        this.length++;
      }
    };
    module2.exports = BitBuffer;
  }
});

// node_modules/qrcode/lib/core/bit-matrix.js
var require_bit_matrix = __commonJS({
  "node_modules/qrcode/lib/core/bit-matrix.js"(exports2, module2) {
    function BitMatrix(size) {
      if (!size || size < 1) {
        throw new Error("BitMatrix size must be defined and greater than 0");
      }
      this.size = size;
      this.data = new Uint8Array(size * size);
      this.reservedBit = new Uint8Array(size * size);
    }
    BitMatrix.prototype.set = function(row, col, value, reserved) {
      const index = row * this.size + col;
      this.data[index] = value;
      if (reserved) this.reservedBit[index] = true;
    };
    BitMatrix.prototype.get = function(row, col) {
      return this.data[row * this.size + col];
    };
    BitMatrix.prototype.xor = function(row, col, value) {
      this.data[row * this.size + col] ^= value;
    };
    BitMatrix.prototype.isReserved = function(row, col) {
      return this.reservedBit[row * this.size + col];
    };
    module2.exports = BitMatrix;
  }
});

// node_modules/qrcode/lib/core/alignment-pattern.js
var require_alignment_pattern = __commonJS({
  "node_modules/qrcode/lib/core/alignment-pattern.js"(exports2) {
    var getSymbolSize = require_utils().getSymbolSize;
    exports2.getRowColCoords = function getRowColCoords(version) {
      if (version === 1) return [];
      const posCount = Math.floor(version / 7) + 2;
      const size = getSymbolSize(version);
      const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
      const positions = [size - 7];
      for (let i = 1; i < posCount - 1; i++) {
        positions[i] = positions[i - 1] - intervals;
      }
      positions.push(6);
      return positions.reverse();
    };
    exports2.getPositions = function getPositions(version) {
      const coords = [];
      const pos = exports2.getRowColCoords(version);
      const posLength = pos.length;
      for (let i = 0; i < posLength; i++) {
        for (let j = 0; j < posLength; j++) {
          if (i === 0 && j === 0 || // top-left
          i === 0 && j === posLength - 1 || // bottom-left
          i === posLength - 1 && j === 0) {
            continue;
          }
          coords.push([pos[i], pos[j]]);
        }
      }
      return coords;
    };
  }
});

// node_modules/qrcode/lib/core/finder-pattern.js
var require_finder_pattern = __commonJS({
  "node_modules/qrcode/lib/core/finder-pattern.js"(exports2) {
    var getSymbolSize = require_utils().getSymbolSize;
    var FINDER_PATTERN_SIZE = 7;
    exports2.getPositions = function getPositions(version) {
      const size = getSymbolSize(version);
      return [
        // top-left
        [0, 0],
        // top-right
        [size - FINDER_PATTERN_SIZE, 0],
        // bottom-left
        [0, size - FINDER_PATTERN_SIZE]
      ];
    };
  }
});

// node_modules/qrcode/lib/core/mask-pattern.js
var require_mask_pattern = __commonJS({
  "node_modules/qrcode/lib/core/mask-pattern.js"(exports2) {
    exports2.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    var PenaltyScores = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    exports2.isValid = function isValid(mask) {
      return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
    };
    exports2.from = function from(value) {
      return exports2.isValid(value) ? parseInt(value, 10) : void 0;
    };
    exports2.getPenaltyN1 = function getPenaltyN1(data) {
      const size = data.size;
      let points = 0;
      let sameCountCol = 0;
      let sameCountRow = 0;
      let lastCol = null;
      let lastRow = null;
      for (let row = 0; row < size; row++) {
        sameCountCol = sameCountRow = 0;
        lastCol = lastRow = null;
        for (let col = 0; col < size; col++) {
          let module3 = data.get(row, col);
          if (module3 === lastCol) {
            sameCountCol++;
          } else {
            if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
            lastCol = module3;
            sameCountCol = 1;
          }
          module3 = data.get(col, row);
          if (module3 === lastRow) {
            sameCountRow++;
          } else {
            if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
            lastRow = module3;
            sameCountRow = 1;
          }
        }
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
      }
      return points;
    };
    exports2.getPenaltyN2 = function getPenaltyN2(data) {
      const size = data.size;
      let points = 0;
      for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size - 1; col++) {
          const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
          if (last === 4 || last === 0) points++;
        }
      }
      return points * PenaltyScores.N2;
    };
    exports2.getPenaltyN3 = function getPenaltyN3(data) {
      const size = data.size;
      let points = 0;
      let bitsCol = 0;
      let bitsRow = 0;
      for (let row = 0; row < size; row++) {
        bitsCol = bitsRow = 0;
        for (let col = 0; col < size; col++) {
          bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
          if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
          bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
          if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
        }
      }
      return points * PenaltyScores.N3;
    };
    exports2.getPenaltyN4 = function getPenaltyN4(data) {
      let darkCount = 0;
      const modulesCount = data.data.length;
      for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
      const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
      return k * PenaltyScores.N4;
    };
    function getMaskAt(maskPattern, i, j) {
      switch (maskPattern) {
        case exports2.Patterns.PATTERN000:
          return (i + j) % 2 === 0;
        case exports2.Patterns.PATTERN001:
          return i % 2 === 0;
        case exports2.Patterns.PATTERN010:
          return j % 3 === 0;
        case exports2.Patterns.PATTERN011:
          return (i + j) % 3 === 0;
        case exports2.Patterns.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case exports2.Patterns.PATTERN101:
          return i * j % 2 + i * j % 3 === 0;
        case exports2.Patterns.PATTERN110:
          return (i * j % 2 + i * j % 3) % 2 === 0;
        case exports2.Patterns.PATTERN111:
          return (i * j % 3 + (i + j) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    }
    exports2.applyMask = function applyMask(pattern, data) {
      const size = data.size;
      for (let col = 0; col < size; col++) {
        for (let row = 0; row < size; row++) {
          if (data.isReserved(row, col)) continue;
          data.xor(row, col, getMaskAt(pattern, row, col));
        }
      }
    };
    exports2.getBestMask = function getBestMask(data, setupFormatFunc) {
      const numPatterns = Object.keys(exports2.Patterns).length;
      let bestPattern = 0;
      let lowerPenalty = Infinity;
      for (let p = 0; p < numPatterns; p++) {
        setupFormatFunc(p);
        exports2.applyMask(p, data);
        const penalty = exports2.getPenaltyN1(data) + exports2.getPenaltyN2(data) + exports2.getPenaltyN3(data) + exports2.getPenaltyN4(data);
        exports2.applyMask(p, data);
        if (penalty < lowerPenalty) {
          lowerPenalty = penalty;
          bestPattern = p;
        }
      }
      return bestPattern;
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-code.js
var require_error_correction_code = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-code.js"(exports2) {
    var ECLevel = require_error_correction_level();
    var EC_BLOCKS_TABLE = [
      // L  M  Q  H
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      1,
      2,
      2,
      4,
      1,
      2,
      4,
      4,
      2,
      4,
      4,
      4,
      2,
      4,
      6,
      5,
      2,
      4,
      6,
      6,
      2,
      5,
      8,
      8,
      4,
      5,
      8,
      8,
      4,
      5,
      8,
      11,
      4,
      8,
      10,
      11,
      4,
      9,
      12,
      16,
      4,
      9,
      16,
      16,
      6,
      10,
      12,
      18,
      6,
      10,
      17,
      16,
      6,
      11,
      16,
      19,
      6,
      13,
      18,
      21,
      7,
      14,
      21,
      25,
      8,
      16,
      20,
      25,
      8,
      17,
      23,
      25,
      9,
      17,
      23,
      34,
      9,
      18,
      25,
      30,
      10,
      20,
      27,
      32,
      12,
      21,
      29,
      35,
      12,
      23,
      34,
      37,
      12,
      25,
      34,
      40,
      13,
      26,
      35,
      42,
      14,
      28,
      38,
      45,
      15,
      29,
      40,
      48,
      16,
      31,
      43,
      51,
      17,
      33,
      45,
      54,
      18,
      35,
      48,
      57,
      19,
      37,
      51,
      60,
      19,
      38,
      53,
      63,
      20,
      40,
      56,
      66,
      21,
      43,
      59,
      70,
      22,
      45,
      62,
      74,
      24,
      47,
      65,
      77,
      25,
      49,
      68,
      81
    ];
    var EC_CODEWORDS_TABLE = [
      // L  M  Q  H
      7,
      10,
      13,
      17,
      10,
      16,
      22,
      28,
      15,
      26,
      36,
      44,
      20,
      36,
      52,
      64,
      26,
      48,
      72,
      88,
      36,
      64,
      96,
      112,
      40,
      72,
      108,
      130,
      48,
      88,
      132,
      156,
      60,
      110,
      160,
      192,
      72,
      130,
      192,
      224,
      80,
      150,
      224,
      264,
      96,
      176,
      260,
      308,
      104,
      198,
      288,
      352,
      120,
      216,
      320,
      384,
      132,
      240,
      360,
      432,
      144,
      280,
      408,
      480,
      168,
      308,
      448,
      532,
      180,
      338,
      504,
      588,
      196,
      364,
      546,
      650,
      224,
      416,
      600,
      700,
      224,
      442,
      644,
      750,
      252,
      476,
      690,
      816,
      270,
      504,
      750,
      900,
      300,
      560,
      810,
      960,
      312,
      588,
      870,
      1050,
      336,
      644,
      952,
      1110,
      360,
      700,
      1020,
      1200,
      390,
      728,
      1050,
      1260,
      420,
      784,
      1140,
      1350,
      450,
      812,
      1200,
      1440,
      480,
      868,
      1290,
      1530,
      510,
      924,
      1350,
      1620,
      540,
      980,
      1440,
      1710,
      570,
      1036,
      1530,
      1800,
      570,
      1064,
      1590,
      1890,
      600,
      1120,
      1680,
      1980,
      630,
      1204,
      1770,
      2100,
      660,
      1260,
      1860,
      2220,
      720,
      1316,
      1950,
      2310,
      750,
      1372,
      2040,
      2430
    ];
    exports2.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
    exports2.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
  }
});

// node_modules/qrcode/lib/core/galois-field.js
var require_galois_field = __commonJS({
  "node_modules/qrcode/lib/core/galois-field.js"(exports2) {
    var EXP_TABLE = new Uint8Array(512);
    var LOG_TABLE = new Uint8Array(256);
    (function initTables() {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        EXP_TABLE[i] = x;
        LOG_TABLE[x] = i;
        x <<= 1;
        if (x & 256) {
          x ^= 285;
        }
      }
      for (let i = 255; i < 512; i++) {
        EXP_TABLE[i] = EXP_TABLE[i - 255];
      }
    })();
    exports2.log = function log(n) {
      if (n < 1) throw new Error("log(" + n + ")");
      return LOG_TABLE[n];
    };
    exports2.exp = function exp(n) {
      return EXP_TABLE[n];
    };
    exports2.mul = function mul(x, y) {
      if (x === 0 || y === 0) return 0;
      return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
    };
  }
});

// node_modules/qrcode/lib/core/polynomial.js
var require_polynomial = __commonJS({
  "node_modules/qrcode/lib/core/polynomial.js"(exports2) {
    var GF = require_galois_field();
    exports2.mul = function mul(p1, p2) {
      const coeff = new Uint8Array(p1.length + p2.length - 1);
      for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
          coeff[i + j] ^= GF.mul(p1[i], p2[j]);
        }
      }
      return coeff;
    };
    exports2.mod = function mod(divident, divisor) {
      let result = new Uint8Array(divident);
      while (result.length - divisor.length >= 0) {
        const coeff = result[0];
        for (let i = 0; i < divisor.length; i++) {
          result[i] ^= GF.mul(divisor[i], coeff);
        }
        let offset = 0;
        while (offset < result.length && result[offset] === 0) offset++;
        result = result.slice(offset);
      }
      return result;
    };
    exports2.generateECPolynomial = function generateECPolynomial(degree) {
      let poly = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        poly = exports2.mul(poly, new Uint8Array([1, GF.exp(i)]));
      }
      return poly;
    };
  }
});

// node_modules/qrcode/lib/core/reed-solomon-encoder.js
var require_reed_solomon_encoder = __commonJS({
  "node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports2, module2) {
    var Polynomial = require_polynomial();
    function ReedSolomonEncoder(degree) {
      this.genPoly = void 0;
      this.degree = degree;
      if (this.degree) this.initialize(this.degree);
    }
    ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
      this.degree = degree;
      this.genPoly = Polynomial.generateECPolynomial(this.degree);
    };
    ReedSolomonEncoder.prototype.encode = function encode(data) {
      if (!this.genPoly) {
        throw new Error("Encoder not initialized");
      }
      const paddedData = new Uint8Array(data.length + this.degree);
      paddedData.set(data);
      const remainder = Polynomial.mod(paddedData, this.genPoly);
      const start = this.degree - remainder.length;
      if (start > 0) {
        const buff = new Uint8Array(this.degree);
        buff.set(remainder, start);
        return buff;
      }
      return remainder;
    };
    module2.exports = ReedSolomonEncoder;
  }
});

// node_modules/qrcode/lib/core/version-check.js
var require_version_check = __commonJS({
  "node_modules/qrcode/lib/core/version-check.js"(exports2) {
    exports2.isValid = function isValid(version) {
      return !isNaN(version) && version >= 1 && version <= 40;
    };
  }
});

// node_modules/qrcode/lib/core/regex.js
var require_regex = __commonJS({
  "node_modules/qrcode/lib/core/regex.js"(exports2) {
    var numeric = "[0-9]+";
    var alphanumeric = "[A-Z $%*+\\-./:]+";
    var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
    kanji = kanji.replace(/u/g, "\\u");
    var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
    exports2.KANJI = new RegExp(kanji, "g");
    exports2.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
    exports2.BYTE = new RegExp(byte, "g");
    exports2.NUMERIC = new RegExp(numeric, "g");
    exports2.ALPHANUMERIC = new RegExp(alphanumeric, "g");
    var TEST_KANJI = new RegExp("^" + kanji + "$");
    var TEST_NUMERIC = new RegExp("^" + numeric + "$");
    var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
    exports2.testKanji = function testKanji(str) {
      return TEST_KANJI.test(str);
    };
    exports2.testNumeric = function testNumeric(str) {
      return TEST_NUMERIC.test(str);
    };
    exports2.testAlphanumeric = function testAlphanumeric(str) {
      return TEST_ALPHANUMERIC.test(str);
    };
  }
});

// node_modules/qrcode/lib/core/mode.js
var require_mode = __commonJS({
  "node_modules/qrcode/lib/core/mode.js"(exports2) {
    var VersionCheck = require_version_check();
    var Regex = require_regex();
    exports2.NUMERIC = {
      id: "Numeric",
      bit: 1 << 0,
      ccBits: [10, 12, 14]
    };
    exports2.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 1 << 1,
      ccBits: [9, 11, 13]
    };
    exports2.BYTE = {
      id: "Byte",
      bit: 1 << 2,
      ccBits: [8, 16, 16]
    };
    exports2.KANJI = {
      id: "Kanji",
      bit: 1 << 3,
      ccBits: [8, 10, 12]
    };
    exports2.MIXED = {
      bit: -1
    };
    exports2.getCharCountIndicator = function getCharCountIndicator(mode, version) {
      if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid version: " + version);
      }
      if (version >= 1 && version < 10) return mode.ccBits[0];
      else if (version < 27) return mode.ccBits[1];
      return mode.ccBits[2];
    };
    exports2.getBestModeForData = function getBestModeForData(dataStr) {
      if (Regex.testNumeric(dataStr)) return exports2.NUMERIC;
      else if (Regex.testAlphanumeric(dataStr)) return exports2.ALPHANUMERIC;
      else if (Regex.testKanji(dataStr)) return exports2.KANJI;
      else return exports2.BYTE;
    };
    exports2.toString = function toString(mode) {
      if (mode && mode.id) return mode.id;
      throw new Error("Invalid mode");
    };
    exports2.isValid = function isValid(mode) {
      return mode && mode.bit && mode.ccBits;
    };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "numeric":
          return exports2.NUMERIC;
        case "alphanumeric":
          return exports2.ALPHANUMERIC;
        case "kanji":
          return exports2.KANJI;
        case "byte":
          return exports2.BYTE;
        default:
          throw new Error("Unknown mode: " + string);
      }
    }
    exports2.from = function from(value, defaultValue) {
      if (exports2.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/version.js
var require_version = __commonJS({
  "node_modules/qrcode/lib/core/version.js"(exports2) {
    var Utils = require_utils();
    var ECCode = require_error_correction_code();
    var ECLevel = require_error_correction_level();
    var Mode = require_mode();
    var VersionCheck = require_version_check();
    var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
    var G18_BCH = Utils.getBCHDigit(G18);
    function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        if (length <= exports2.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    function getReservedBitsCount(mode, version) {
      return Mode.getCharCountIndicator(mode, version) + 4;
    }
    function getTotalBitsFromDataArray(segments, version) {
      let totalBits = 0;
      segments.forEach(function(data) {
        const reservedBits = getReservedBitsCount(data.mode, version);
        totalBits += reservedBits + data.getBitsLength();
      });
      return totalBits;
    }
    function getBestVersionForMixedData(segments, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        const length = getTotalBitsFromDataArray(segments, currentVersion);
        if (length <= exports2.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    exports2.from = function from(value, defaultValue) {
      if (VersionCheck.isValid(value)) {
        return parseInt(value, 10);
      }
      return defaultValue;
    };
    exports2.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid QR Code version");
      }
      if (typeof mode === "undefined") mode = Mode.BYTE;
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (mode === Mode.MIXED) return dataTotalCodewordsBits;
      const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
      switch (mode) {
        case Mode.NUMERIC:
          return Math.floor(usableBits / 10 * 3);
        case Mode.ALPHANUMERIC:
          return Math.floor(usableBits / 11 * 2);
        case Mode.KANJI:
          return Math.floor(usableBits / 13);
        case Mode.BYTE:
        default:
          return Math.floor(usableBits / 8);
      }
    };
    exports2.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
      let seg;
      const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
      if (Array.isArray(data)) {
        if (data.length > 1) {
          return getBestVersionForMixedData(data, ecl);
        }
        if (data.length === 0) {
          return 1;
        }
        seg = data[0];
      } else {
        seg = data;
      }
      return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
    };
    exports2.getEncodedBits = function getEncodedBits(version) {
      if (!VersionCheck.isValid(version) || version < 7) {
        throw new Error("Invalid QR Code version");
      }
      let d = version << 12;
      while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
        d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
      }
      return version << 12 | d;
    };
  }
});

// node_modules/qrcode/lib/core/format-info.js
var require_format_info = __commonJS({
  "node_modules/qrcode/lib/core/format-info.js"(exports2) {
    var Utils = require_utils();
    var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
    var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
    var G15_BCH = Utils.getBCHDigit(G15);
    exports2.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
      const data = errorCorrectionLevel.bit << 3 | mask;
      let d = data << 10;
      while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
        d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
      }
      return (data << 10 | d) ^ G15_MASK;
    };
  }
});

// node_modules/qrcode/lib/core/numeric-data.js
var require_numeric_data = __commonJS({
  "node_modules/qrcode/lib/core/numeric-data.js"(exports2, module2) {
    var Mode = require_mode();
    function NumericData(data) {
      this.mode = Mode.NUMERIC;
      this.data = data.toString();
    }
    NumericData.getBitsLength = function getBitsLength(length) {
      return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
    };
    NumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    NumericData.prototype.getBitsLength = function getBitsLength() {
      return NumericData.getBitsLength(this.data.length);
    };
    NumericData.prototype.write = function write(bitBuffer) {
      let i, group, value;
      for (i = 0; i + 3 <= this.data.length; i += 3) {
        group = this.data.substr(i, 3);
        value = parseInt(group, 10);
        bitBuffer.put(value, 10);
      }
      const remainingNum = this.data.length - i;
      if (remainingNum > 0) {
        group = this.data.substr(i);
        value = parseInt(group, 10);
        bitBuffer.put(value, remainingNum * 3 + 1);
      }
    };
    module2.exports = NumericData;
  }
});

// node_modules/qrcode/lib/core/alphanumeric-data.js
var require_alphanumeric_data = __commonJS({
  "node_modules/qrcode/lib/core/alphanumeric-data.js"(exports2, module2) {
    var Mode = require_mode();
    var ALPHA_NUM_CHARS = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":"
    ];
    function AlphanumericData(data) {
      this.mode = Mode.ALPHANUMERIC;
      this.data = data;
    }
    AlphanumericData.getBitsLength = function getBitsLength(length) {
      return 11 * Math.floor(length / 2) + 6 * (length % 2);
    };
    AlphanumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    AlphanumericData.prototype.getBitsLength = function getBitsLength() {
      return AlphanumericData.getBitsLength(this.data.length);
    };
    AlphanumericData.prototype.write = function write(bitBuffer) {
      let i;
      for (i = 0; i + 2 <= this.data.length; i += 2) {
        let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
        value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
        bitBuffer.put(value, 11);
      }
      if (this.data.length % 2) {
        bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
      }
    };
    module2.exports = AlphanumericData;
  }
});

// node_modules/qrcode/lib/core/byte-data.js
var require_byte_data = __commonJS({
  "node_modules/qrcode/lib/core/byte-data.js"(exports2, module2) {
    var Mode = require_mode();
    function ByteData(data) {
      this.mode = Mode.BYTE;
      if (typeof data === "string") {
        this.data = new TextEncoder().encode(data);
      } else {
        this.data = new Uint8Array(data);
      }
    }
    ByteData.getBitsLength = function getBitsLength(length) {
      return length * 8;
    };
    ByteData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    ByteData.prototype.getBitsLength = function getBitsLength() {
      return ByteData.getBitsLength(this.data.length);
    };
    ByteData.prototype.write = function(bitBuffer) {
      for (let i = 0, l = this.data.length; i < l; i++) {
        bitBuffer.put(this.data[i], 8);
      }
    };
    module2.exports = ByteData;
  }
});

// node_modules/qrcode/lib/core/kanji-data.js
var require_kanji_data = __commonJS({
  "node_modules/qrcode/lib/core/kanji-data.js"(exports2, module2) {
    var Mode = require_mode();
    var Utils = require_utils();
    function KanjiData(data) {
      this.mode = Mode.KANJI;
      this.data = data;
    }
    KanjiData.getBitsLength = function getBitsLength(length) {
      return length * 13;
    };
    KanjiData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    KanjiData.prototype.getBitsLength = function getBitsLength() {
      return KanjiData.getBitsLength(this.data.length);
    };
    KanjiData.prototype.write = function(bitBuffer) {
      let i;
      for (i = 0; i < this.data.length; i++) {
        let value = Utils.toSJIS(this.data[i]);
        if (value >= 33088 && value <= 40956) {
          value -= 33088;
        } else if (value >= 57408 && value <= 60351) {
          value -= 49472;
        } else {
          throw new Error(
            "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
          );
        }
        value = (value >>> 8 & 255) * 192 + (value & 255);
        bitBuffer.put(value, 13);
      }
    };
    module2.exports = KanjiData;
  }
});

// node_modules/dijkstrajs/dijkstra.js
var require_dijkstra = __commonJS({
  "node_modules/dijkstrajs/dijkstra.js"(exports2, module2) {
    "use strict";
    var dijkstra = {
      single_source_shortest_paths: function(graph, s, d) {
        var predecessors = {};
        var costs = {};
        costs[s] = 0;
        var open = dijkstra.PriorityQueue.make();
        open.push(s, 0);
        var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
        while (!open.empty()) {
          closest = open.pop();
          u = closest.value;
          cost_of_s_to_u = closest.cost;
          adjacent_nodes = graph[u] || {};
          for (v in adjacent_nodes) {
            if (adjacent_nodes.hasOwnProperty(v)) {
              cost_of_e = adjacent_nodes[v];
              cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
              cost_of_s_to_v = costs[v];
              first_visit = typeof costs[v] === "undefined";
              if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                costs[v] = cost_of_s_to_u_plus_cost_of_e;
                open.push(v, cost_of_s_to_u_plus_cost_of_e);
                predecessors[v] = u;
              }
            }
          }
        }
        if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
          var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
          throw new Error(msg);
        }
        return predecessors;
      },
      extract_shortest_path_from_predecessor_list: function(predecessors, d) {
        var nodes = [];
        var u = d;
        var predecessor;
        while (u) {
          nodes.push(u);
          predecessor = predecessors[u];
          u = predecessors[u];
        }
        nodes.reverse();
        return nodes;
      },
      find_path: function(graph, s, d) {
        var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
        return dijkstra.extract_shortest_path_from_predecessor_list(
          predecessors,
          d
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(opts) {
          var T = dijkstra.PriorityQueue, t = {}, key;
          opts = opts || {};
          for (key in T) {
            if (T.hasOwnProperty(key)) {
              t[key] = T[key];
            }
          }
          t.queue = [];
          t.sorter = opts.sorter || T.default_sorter;
          return t;
        },
        default_sorter: function(a, b) {
          return a.cost - b.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(value, cost) {
          var item = { value, cost };
          this.queue.push(item);
          this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    if (typeof module2 !== "undefined") {
      module2.exports = dijkstra;
    }
  }
});

// node_modules/qrcode/lib/core/segments.js
var require_segments = __commonJS({
  "node_modules/qrcode/lib/core/segments.js"(exports2) {
    var Mode = require_mode();
    var NumericData = require_numeric_data();
    var AlphanumericData = require_alphanumeric_data();
    var ByteData = require_byte_data();
    var KanjiData = require_kanji_data();
    var Regex = require_regex();
    var Utils = require_utils();
    var dijkstra = require_dijkstra();
    function getStringByteLength(str) {
      return unescape(encodeURIComponent(str)).length;
    }
    function getSegments(regex, mode, str) {
      const segments = [];
      let result;
      while ((result = regex.exec(str)) !== null) {
        segments.push({
          data: result[0],
          index: result.index,
          mode,
          length: result[0].length
        });
      }
      return segments;
    }
    function getSegmentsFromString(dataStr) {
      const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
      const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
      let byteSegs;
      let kanjiSegs;
      if (Utils.isKanjiModeEnabled()) {
        byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
        kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
      } else {
        byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
        kanjiSegs = [];
      }
      const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
      return segs.sort(function(s1, s2) {
        return s1.index - s2.index;
      }).map(function(obj) {
        return {
          data: obj.data,
          mode: obj.mode,
          length: obj.length
        };
      });
    }
    function getSegmentBitsLength(length, mode) {
      switch (mode) {
        case Mode.NUMERIC:
          return NumericData.getBitsLength(length);
        case Mode.ALPHANUMERIC:
          return AlphanumericData.getBitsLength(length);
        case Mode.KANJI:
          return KanjiData.getBitsLength(length);
        case Mode.BYTE:
          return ByteData.getBitsLength(length);
      }
    }
    function mergeSegments(segs) {
      return segs.reduce(function(acc, curr) {
        const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
        if (prevSeg && prevSeg.mode === curr.mode) {
          acc[acc.length - 1].data += curr.data;
          return acc;
        }
        acc.push(curr);
        return acc;
      }, []);
    }
    function buildNodes(segs) {
      const nodes = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        switch (seg.mode) {
          case Mode.NUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.ALPHANUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.KANJI:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
            break;
          case Mode.BYTE:
            nodes.push([
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
        }
      }
      return nodes;
    }
    function buildGraph(nodes, version) {
      const table = {};
      const graph = { start: {} };
      let prevNodeIds = ["start"];
      for (let i = 0; i < nodes.length; i++) {
        const nodeGroup = nodes[i];
        const currentNodeIds = [];
        for (let j = 0; j < nodeGroup.length; j++) {
          const node = nodeGroup[j];
          const key = "" + i + j;
          currentNodeIds.push(key);
          table[key] = { node, lastCount: 0 };
          graph[key] = {};
          for (let n = 0; n < prevNodeIds.length; n++) {
            const prevNodeId = prevNodeIds[n];
            if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
              graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
              table[prevNodeId].lastCount += node.length;
            } else {
              if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
              graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
            }
          }
        }
        prevNodeIds = currentNodeIds;
      }
      for (let n = 0; n < prevNodeIds.length; n++) {
        graph[prevNodeIds[n]].end = 0;
      }
      return { map: graph, table };
    }
    function buildSingleSegment(data, modesHint) {
      let mode;
      const bestMode = Mode.getBestModeForData(data);
      mode = Mode.from(modesHint, bestMode);
      if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
        throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
      }
      if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
        mode = Mode.BYTE;
      }
      switch (mode) {
        case Mode.NUMERIC:
          return new NumericData(data);
        case Mode.ALPHANUMERIC:
          return new AlphanumericData(data);
        case Mode.KANJI:
          return new KanjiData(data);
        case Mode.BYTE:
          return new ByteData(data);
      }
    }
    exports2.fromArray = function fromArray(array) {
      return array.reduce(function(acc, seg) {
        if (typeof seg === "string") {
          acc.push(buildSingleSegment(seg, null));
        } else if (seg.data) {
          acc.push(buildSingleSegment(seg.data, seg.mode));
        }
        return acc;
      }, []);
    };
    exports2.fromString = function fromString(data, version) {
      const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
      const nodes = buildNodes(segs);
      const graph = buildGraph(nodes, version);
      const path = dijkstra.find_path(graph.map, "start", "end");
      const optimizedSegs = [];
      for (let i = 1; i < path.length - 1; i++) {
        optimizedSegs.push(graph.table[path[i]].node);
      }
      return exports2.fromArray(mergeSegments(optimizedSegs));
    };
    exports2.rawSplit = function rawSplit(data) {
      return exports2.fromArray(
        getSegmentsFromString(data, Utils.isKanjiModeEnabled())
      );
    };
  }
});

// node_modules/qrcode/lib/core/qrcode.js
var require_qrcode = __commonJS({
  "node_modules/qrcode/lib/core/qrcode.js"(exports2) {
    var Utils = require_utils();
    var ECLevel = require_error_correction_level();
    var BitBuffer = require_bit_buffer();
    var BitMatrix = require_bit_matrix();
    var AlignmentPattern = require_alignment_pattern();
    var FinderPattern = require_finder_pattern();
    var MaskPattern = require_mask_pattern();
    var ECCode = require_error_correction_code();
    var ReedSolomonEncoder = require_reed_solomon_encoder();
    var Version = require_version();
    var FormatInfo = require_format_info();
    var Mode = require_mode();
    var Segments = require_segments();
    function setupFinderPattern(matrix, version) {
      const size = matrix.size;
      const pos = FinderPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || size <= row + r) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || size <= col + c) continue;
            if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupTimingPattern(matrix) {
      const size = matrix.size;
      for (let r = 8; r < size - 8; r++) {
        const value = r % 2 === 0;
        matrix.set(r, 6, value, true);
        matrix.set(6, r, value, true);
      }
    }
    function setupAlignmentPattern(matrix, version) {
      const pos = AlignmentPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupVersionInfo(matrix, version) {
      const size = matrix.size;
      const bits = Version.getEncodedBits(version);
      let row, col, mod;
      for (let i = 0; i < 18; i++) {
        row = Math.floor(i / 3);
        col = i % 3 + size - 8 - 3;
        mod = (bits >> i & 1) === 1;
        matrix.set(row, col, mod, true);
        matrix.set(col, row, mod, true);
      }
    }
    function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
      const size = matrix.size;
      const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
      let i, mod;
      for (i = 0; i < 15; i++) {
        mod = (bits >> i & 1) === 1;
        if (i < 6) {
          matrix.set(i, 8, mod, true);
        } else if (i < 8) {
          matrix.set(i + 1, 8, mod, true);
        } else {
          matrix.set(size - 15 + i, 8, mod, true);
        }
        if (i < 8) {
          matrix.set(8, size - i - 1, mod, true);
        } else if (i < 9) {
          matrix.set(8, 15 - i - 1 + 1, mod, true);
        } else {
          matrix.set(8, 15 - i - 1, mod, true);
        }
      }
      matrix.set(size - 8, 8, 1, true);
    }
    function setupData(matrix, data) {
      const size = matrix.size;
      let inc = -1;
      let row = size - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (!matrix.isReserved(row, col - c)) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) === 1;
              }
              matrix.set(row, col - c, dark);
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || size <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
    function createData(version, errorCorrectionLevel, segments) {
      const buffer = new BitBuffer();
      segments.forEach(function(data) {
        buffer.put(data.mode.bit, 4);
        buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
        data.write(buffer);
      });
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 !== 0) {
        buffer.putBit(0);
      }
      const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
      for (let i = 0; i < remainingByte; i++) {
        buffer.put(i % 2 ? 17 : 236, 8);
      }
      return createCodewords(buffer, version, errorCorrectionLevel);
    }
    function createCodewords(bitBuffer, version, errorCorrectionLevel) {
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewords = totalCodewords - ecTotalCodewords;
      const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
      const blocksInGroup2 = totalCodewords % ecTotalBlocks;
      const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
      const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
      const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
      const rs = new ReedSolomonEncoder(ecCount);
      let offset = 0;
      const dcData = new Array(ecTotalBlocks);
      const ecData = new Array(ecTotalBlocks);
      let maxDataSize = 0;
      const buffer = new Uint8Array(bitBuffer.buffer);
      for (let b = 0; b < ecTotalBlocks; b++) {
        const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
        dcData[b] = buffer.slice(offset, offset + dataSize);
        ecData[b] = rs.encode(dcData[b]);
        offset += dataSize;
        maxDataSize = Math.max(maxDataSize, dataSize);
      }
      const data = new Uint8Array(totalCodewords);
      let index = 0;
      let i, r;
      for (i = 0; i < maxDataSize; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          if (i < dcData[r].length) {
            data[index++] = dcData[r][i];
          }
        }
      }
      for (i = 0; i < ecCount; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          data[index++] = ecData[r][i];
        }
      }
      return data;
    }
    function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
      let segments;
      if (Array.isArray(data)) {
        segments = Segments.fromArray(data);
      } else if (typeof data === "string") {
        let estimatedVersion = version;
        if (!estimatedVersion) {
          const rawSegments = Segments.rawSplit(data);
          estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
        }
        segments = Segments.fromString(data, estimatedVersion || 40);
      } else {
        throw new Error("Invalid data");
      }
      const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
      if (!bestVersion) {
        throw new Error("The amount of data is too big to be stored in a QR Code");
      }
      if (!version) {
        version = bestVersion;
      } else if (version < bestVersion) {
        throw new Error(
          "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
        );
      }
      const dataBits = createData(version, errorCorrectionLevel, segments);
      const moduleCount = Utils.getSymbolSize(version);
      const modules = new BitMatrix(moduleCount);
      setupFinderPattern(modules, version);
      setupTimingPattern(modules);
      setupAlignmentPattern(modules, version);
      setupFormatInfo(modules, errorCorrectionLevel, 0);
      if (version >= 7) {
        setupVersionInfo(modules, version);
      }
      setupData(modules, dataBits);
      if (isNaN(maskPattern)) {
        maskPattern = MaskPattern.getBestMask(
          modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel)
        );
      }
      MaskPattern.applyMask(maskPattern, modules);
      setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
      return {
        modules,
        version,
        errorCorrectionLevel,
        maskPattern,
        segments
      };
    }
    exports2.create = function create(data, options) {
      if (typeof data === "undefined" || data === "") {
        throw new Error("No input text");
      }
      let errorCorrectionLevel = ECLevel.M;
      let version;
      let mask;
      if (typeof options !== "undefined") {
        errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
        version = Version.from(options.version);
        mask = MaskPattern.from(options.maskPattern);
        if (options.toSJISFunc) {
          Utils.setToSJISFunction(options.toSJISFunc);
        }
      }
      return createSymbol(data, version, errorCorrectionLevel, mask);
    };
  }
});

// node_modules/qrcode/lib/renderer/utils.js
var require_utils2 = __commonJS({
  "node_modules/qrcode/lib/renderer/utils.js"(exports2) {
    function hex2rgba(hex) {
      if (typeof hex === "number") {
        hex = hex.toString();
      }
      if (typeof hex !== "string") {
        throw new Error("Color should be defined as hex string");
      }
      let hexCode = hex.slice().replace("#", "").split("");
      if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
        throw new Error("Invalid hex color: " + hex);
      }
      if (hexCode.length === 3 || hexCode.length === 4) {
        hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
          return [c, c];
        }));
      }
      if (hexCode.length === 6) hexCode.push("F", "F");
      const hexValue = parseInt(hexCode.join(""), 16);
      return {
        r: hexValue >> 24 & 255,
        g: hexValue >> 16 & 255,
        b: hexValue >> 8 & 255,
        a: hexValue & 255,
        hex: "#" + hexCode.slice(0, 6).join("")
      };
    }
    exports2.getOptions = function getOptions(options) {
      if (!options) options = {};
      if (!options.color) options.color = {};
      const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
      const width = options.width && options.width >= 21 ? options.width : void 0;
      const scale = options.scale || 4;
      return {
        width,
        scale: width ? 4 : scale,
        margin,
        color: {
          dark: hex2rgba(options.color.dark || "#000000ff"),
          light: hex2rgba(options.color.light || "#ffffffff")
        },
        type: options.type,
        rendererOpts: options.rendererOpts || {}
      };
    };
    exports2.getScale = function getScale(qrSize, opts) {
      return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
    };
    exports2.getImageWidth = function getImageWidth(qrSize, opts) {
      const scale = exports2.getScale(qrSize, opts);
      return Math.floor((qrSize + opts.margin * 2) * scale);
    };
    exports2.qrToImageData = function qrToImageData(imgData, qr, opts) {
      const size = qr.modules.size;
      const data = qr.modules.data;
      const scale = exports2.getScale(size, opts);
      const symbolSize = Math.floor((size + opts.margin * 2) * scale);
      const scaledMargin = opts.margin * scale;
      const palette = [opts.color.light, opts.color.dark];
      for (let i = 0; i < symbolSize; i++) {
        for (let j = 0; j < symbolSize; j++) {
          let posDst = (i * symbolSize + j) * 4;
          let pxColor = opts.color.light;
          if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
            const iSrc = Math.floor((i - scaledMargin) / scale);
            const jSrc = Math.floor((j - scaledMargin) / scale);
            pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
          }
          imgData[posDst++] = pxColor.r;
          imgData[posDst++] = pxColor.g;
          imgData[posDst++] = pxColor.b;
          imgData[posDst] = pxColor.a;
        }
      }
    };
  }
});

// node_modules/qrcode/lib/renderer/canvas.js
var require_canvas = __commonJS({
  "node_modules/qrcode/lib/renderer/canvas.js"(exports2) {
    var Utils = require_utils2();
    function clearCanvas(ctx, canvas, size) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!canvas.style) canvas.style = {};
      canvas.height = size;
      canvas.width = size;
      canvas.style.height = size + "px";
      canvas.style.width = size + "px";
    }
    function getCanvasElement() {
      try {
        return document.createElement("canvas");
      } catch (e) {
        throw new Error("You need to specify a canvas element");
      }
    }
    exports2.render = function render(qrData, canvas, options) {
      let opts = options;
      let canvasEl = canvas;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!canvas) {
        canvasEl = getCanvasElement();
      }
      opts = Utils.getOptions(opts);
      const size = Utils.getImageWidth(qrData.modules.size, opts);
      const ctx = canvasEl.getContext("2d");
      const image = ctx.createImageData(size, size);
      Utils.qrToImageData(image.data, qrData, opts);
      clearCanvas(ctx, canvasEl, size);
      ctx.putImageData(image, 0, 0);
      return canvasEl;
    };
    exports2.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
      let opts = options;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!opts) opts = {};
      const canvasEl = exports2.render(qrData, canvas, opts);
      const type = opts.type || "image/png";
      const rendererOpts = opts.rendererOpts || {};
      return canvasEl.toDataURL(type, rendererOpts.quality);
    };
  }
});

// node_modules/qrcode/lib/renderer/svg-tag.js
var require_svg_tag = __commonJS({
  "node_modules/qrcode/lib/renderer/svg-tag.js"(exports2) {
    var Utils = require_utils2();
    function getColorAttrib(color, attrib) {
      const alpha = color.a / 255;
      const str = attrib + '="' + color.hex + '"';
      return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
    }
    function svgCmd(cmd, x, y) {
      let str = cmd + x;
      if (typeof y !== "undefined") str += " " + y;
      return str;
    }
    function qrToPath(data, size, margin) {
      let path = "";
      let moveBy = 0;
      let newRow = false;
      let lineLength = 0;
      for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i % size);
        const row = Math.floor(i / size);
        if (!col && !newRow) newRow = true;
        if (data[i]) {
          lineLength++;
          if (!(i > 0 && col > 0 && data[i - 1])) {
            path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
            moveBy = 0;
            newRow = false;
          }
          if (!(col + 1 < size && data[i + 1])) {
            path += svgCmd("h", lineLength);
            lineLength = 0;
          }
        } else {
          moveBy++;
        }
      }
      return path;
    }
    exports2.render = function render(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const qrcodesize = size + opts.margin * 2;
      const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
      const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
      const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
      const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
      const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + "</svg>\n";
      if (typeof cb === "function") {
        cb(null, svgTag);
      }
      return svgTag;
    };
  }
});

// node_modules/qrcode/lib/browser.js
var require_browser = __commonJS({
  "node_modules/qrcode/lib/browser.js"(exports2) {
    var canPromise = require_can_promise();
    var QRCode2 = require_qrcode();
    var CanvasRenderer = require_canvas();
    var SvgRenderer = require_svg_tag();
    function renderCanvas(renderFunc, canvas, text, opts, cb) {
      const args = [].slice.call(arguments, 1);
      const argsNum = args.length;
      const isLastArgCb = typeof args[argsNum - 1] === "function";
      if (!isLastArgCb && !canPromise()) {
        throw new Error("Callback required as last argument");
      }
      if (isLastArgCb) {
        if (argsNum < 2) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 2) {
          cb = text;
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 3) {
          if (canvas.getContext && typeof cb === "undefined") {
            cb = opts;
            opts = void 0;
          } else {
            cb = opts;
            opts = text;
            text = canvas;
            canvas = void 0;
          }
        }
      } else {
        if (argsNum < 1) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 1) {
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 2 && !canvas.getContext) {
          opts = text;
          text = canvas;
          canvas = void 0;
        }
        return new Promise(function(resolve, reject) {
          try {
            const data = QRCode2.create(text, opts);
            resolve(renderFunc(data, canvas, opts));
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode2.create(text, opts);
        cb(null, renderFunc(data, canvas, opts));
      } catch (e) {
        cb(e);
      }
    }
    exports2.create = QRCode2.create;
    exports2.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
    exports2.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
    exports2.toString = renderCanvas.bind(null, function(data, _, opts) {
      return SvgRenderer.render(data, opts);
    });
  }
});

// src/main.js
var {
  Plugin,
  Notice,
  PluginSettingTab,
  Setting,
  Modal,
  TFile,
  Platform,
  normalizePath,
  requestUrl,
  arrayBufferToHex
} = require("obsidian");
var QRCode = require_browser();
var GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
var GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
var GOOGLE_DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
var GOOGLE_SCOPE_DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";
var AUTH_SCOPES = [GOOGLE_SCOPE_DRIVE_FILE];
var TOKEN_SECRET_ID = "google-drive-mirror-visible-folder-auth";
var LOOPBACK_HOST = "127.0.0.1";
var LOOPBACK_PATH = "/oauth2callback";
var LOOPBACK_TIMEOUT_MS = 3 * 60 * 1e3;
var REMOTE_MANIFEST_VERSION = 1;
var STORAGE_PROVIDER_VERSION = "gdrive-visible-folder-v1";
var REMOTE_MANIFEST_NAME = ".gdrive-mirror-manifest.json";
var REMOTE_CONFLICTS_DIR = "conflicts";
var DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
var SETUP_BUNDLE_VERSION = 1;
var IMPORT_BUNDLE_ACTION = "google-drive-mirror-import-bundle";
var DEFAULT_INCLUDE_EXTENSIONS = [
  "md",
  "markdown",
  "canvas",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "pdf",
  "json",
  "css",
  "js",
  "txt",
  "yaml",
  "yml"
].join(", ");
var DEFAULT_OBSIDIAN_ALLOWLIST = [
  "app.json",
  "appearance.json",
  "community-plugins.json",
  "core-plugins.json",
  "hotkeys.json"
].join("\n");
var DEFAULT_EXCLUDED_PREFIXES = [".trash"].join("\n");
var TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
  "md",
  "markdown",
  "canvas",
  "json",
  "css",
  "js",
  "txt",
  "yaml",
  "yml",
  "svg"
]);
var DEFAULT_SETTINGS = {
  storageProviderVersion: STORAGE_PROVIDER_VERSION,
  clientId: "",
  clientSecret: "",
  remoteVaultName: "",
  includeExtensions: DEFAULT_INCLUDE_EXTENSIONS,
  excludedPathPrefixes: DEFAULT_EXCLUDED_PREFIXES,
  syncObsidianFiles: false,
  obsidianAllowlist: DEFAULT_OBSIDIAN_ALLOWLIST,
  storedTokensFallback: null,
  lastAuthError: "",
  lastLocalManifest: {},
  lastRemoteManifest: {},
  lastSyncAt: null,
  lastRemoteFolderId: ""
};
module.exports = class GoogleDriveMirrorPlugin extends Plugin {
  async onload() {
    this.operationLabel = null;
    this.authSession = null;
    this.pendingAuthPromise = null;
    this.cachedTokens = null;
    this.remoteRootFolderCache = null;
    this.statusBar = this.addStatusBarItem();
    await this.loadSettings();
    this.addSettingTab(new GoogleDriveMirrorSettingTab(this.app, this));
    this.addRibbonIcon("cloud-upload", "Push all local changes to Google Drive", async () => {
      await this.pushAllChanges();
    });
    this.addCommand({
      id: "google-drive-start-sign-in",
      name: "Start Google Drive sign-in",
      callback: async () => {
        await this.beginSignIn();
      }
    });
    this.addCommand({
      id: "google-drive-push-active-file",
      name: "Push current file to Google Drive",
      callback: async () => {
        await this.pushActiveFile();
      }
    });
    this.addCommand({
      id: "google-drive-push-all",
      name: "Push all local changes to Google Drive",
      callback: async () => {
        await this.pushAllChanges();
      }
    });
    this.addCommand({
      id: "google-drive-pull-all",
      name: "Pull remote changes from Google Drive",
      callback: async () => {
        await this.pullRemoteChanges();
      }
    });
    this.addCommand({
      id: "google-drive-clear-auth",
      name: "Clear Google Drive sign-in",
      callback: async () => {
        await this.clearStoredTokens();
        new Notice("Google Drive sign-in cleared.");
      }
    });
    this.addCommand({
      id: "google-drive-open-remote-folder",
      name: "Open remote Google Drive folder",
      callback: async () => {
        this.openRemoteFolderUrl();
      }
    });
    this.addCommand({
      id: "google-drive-copy-setup-bundle",
      name: "Copy Google Drive setup bundle",
      callback: async () => {
        await this.copySetupBundle();
      }
    });
    this.addCommand({
      id: "google-drive-import-setup-bundle",
      name: "Import Google Drive setup bundle",
      callback: async () => {
        await this.openImportSetupBundleModal();
      }
    });
    this.addCommand({
      id: "google-drive-show-setup-bundle-qr",
      name: "Show Google Drive setup bundle QR",
      callback: async () => {
        await this.showSetupBundleQr();
      }
    });
    this.registerObsidianProtocolHandler(IMPORT_BUNDLE_ACTION, async (params) => {
      try {
        await this.handleImportBundleProtocol(params);
      } catch (error) {
        new Notice(this.formatError(error), 1e4);
      }
    });
    this.setStatus("idle");
  }
  onunload() {
    if (this.authSession) {
      this.authSession.close();
      this.authSession = null;
    }
  }
  async loadSettings() {
    const loaded = await this.loadData() || {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    this.cachedTokens = this.settings.storedTokensFallback || null;
    this.remoteRootFolderCache = null;
    if (loaded.storageProviderVersion !== STORAGE_PROVIDER_VERSION) {
      this.settings.storageProviderVersion = STORAGE_PROVIDER_VERSION;
      this.settings.storedTokensFallback = null;
      this.settings.lastAuthError = "";
      this.settings.lastLocalManifest = {};
      this.settings.lastRemoteManifest = {};
      this.settings.lastSyncAt = null;
      this.settings.lastRemoteFolderId = "";
      this.cachedTokens = null;
    }
    if (!this.settings.remoteVaultName) {
      this.settings.remoteVaultName = this.defaultRemoteVaultName();
      await this.saveSettings();
      return;
    }
    const sanitizedRemoteVaultName = sanitizeDriveFolderName(this.settings.remoteVaultName);
    if (sanitizedRemoteVaultName !== this.settings.remoteVaultName) {
      this.settings.remoteVaultName = sanitizedRemoteVaultName;
      this.settings.lastRemoteFolderId = "";
      await this.saveSettings();
      return;
    }
    if (loaded.storageProviderVersion !== STORAGE_PROVIDER_VERSION) {
      await this.saveSettings();
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async rememberRemoteRootFolder(folderId, folderName) {
    if (!folderId) {
      return;
    }
    this.remoteRootFolderCache = {
      id: folderId,
      name: folderName || this.getRemoteRootFolderName()
    };
    if (this.settings.lastRemoteFolderId === folderId) {
      return;
    }
    this.settings.lastRemoteFolderId = folderId;
    await this.saveSettings();
  }
  getRemoteFolderUrl() {
    const folderId = this.settings.lastRemoteFolderId || this.remoteRootFolderCache?.id || "";
    return folderId ? `https://drive.google.com/drive/folders/${folderId}` : "";
  }
  openRemoteFolderUrl() {
    const url = this.getRemoteFolderUrl();
    if (!url) {
      throw new Error("The remote Drive folder has not been created yet. Push once first.");
    }
    this.openExternalUrl(url);
  }
  setStatus(label) {
    const suffix = this.operationLabel ? this.operationLabel : label;
    this.statusBar.setText(`Google Drive Mirror: ${suffix}`);
  }
  defaultRemoteVaultName() {
    const name = (this.app.vault.getName() || "default-vault").trim();
    return name.replace(/[\\/:*?"<>|]/g, "-") || "default-vault";
  }
  async runOperation(label, fn) {
    if (this.operationLabel) {
      new Notice(`Google Drive Mirror is busy: ${this.operationLabel}`);
      return;
    }
    this.operationLabel = label;
    this.setStatus(label);
    try {
      return await fn();
    } catch (error) {
      console.error("Google Drive Mirror error", error);
      new Notice(this.formatError(error), 8e3);
      throw error;
    } finally {
      this.operationLabel = null;
      this.setStatus("idle");
    }
  }
  async beginSignIn() {
    await this.requireConfigured(true);
    if (!Platform.isDesktopApp) {
      throw new Error(
        "Google Drive sign-in currently supports the desktop app only. On iPhone/iPad, import a setup bundle exported from your desktop device."
      );
    }
    if (this.authSession) {
      throw new Error("A Google sign-in flow is already waiting for the browser callback.");
    }
    const verifier = createPkceVerifier();
    const challenge = await createPkceChallenge(verifier);
    const state = createRandomToken(24);
    const authSession = await this.createLoopbackAuthSession();
    this.authSession = authSession;
    this.pendingAuthPromise = (async () => {
      this.openExternalUrl(
        this.buildAuthorizeUrl(state, challenge, authSession.redirectUri)
      );
      new Notice(
        "Google sign-in opened in your browser. Complete the consent flow there; the plugin is waiting for the localhost callback.",
        12e3
      );
      try {
        const params = await authSession.waitForCallback();
        await this.finishSignIn(params, verifier, state, authSession.redirectUri);
        new Notice("Google Drive sign-in completed.");
      } finally {
        authSession.close();
        if (this.authSession === authSession) {
          this.authSession = null;
        }
      }
    })();
    try {
      await this.pendingAuthPromise;
    } catch (error) {
      this.settings.lastAuthError = this.formatError(error);
      await this.saveSettings();
      new Notice(this.settings.lastAuthError, 1e4);
      throw error;
    } finally {
      this.pendingAuthPromise = null;
    }
  }
  openExternalUrl(url) {
    try {
      const { shell } = require("electron");
      if (shell && typeof shell.openExternal === "function") {
        shell.openExternal(url);
        return;
      }
    } catch (_error) {
    }
    window.open(url, "_blank");
  }
  buildAuthorizeUrl(state, challenge, redirectUri) {
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", this.settings.clientId.trim());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", AUTH_SCOPES.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return url.toString();
  }
  async createLoopbackAuthSession() {
    const http = require("node:http");
    let timer = null;
    let server = null;
    let settled = false;
    let callbackResolve = null;
    let callbackReject = null;
    const callbackPromise = new Promise((resolve, reject) => {
      callbackResolve = resolve;
      callbackReject = reject;
    });
    const close = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (server && server.listening) {
        server.close();
      }
    };
    const settleSuccess = (params) => {
      if (settled) {
        return;
      }
      settled = true;
      close();
      callbackResolve(params);
    };
    const settleError = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      close();
      callbackReject(error);
    };
    const redirectUri = await new Promise((resolve, reject) => {
      server = http.createServer((request, response) => {
        try {
          const requestUrl2 = new URL(
            request.url || "/",
            `http://${LOOPBACK_HOST}`
          );
          if (requestUrl2.pathname !== LOOPBACK_PATH) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not found.");
            return;
          }
          const params = {};
          requestUrl2.searchParams.forEach((value, key) => {
            params[key] = value;
          });
          const success = !params.error;
          response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          response.end(buildLoopbackCallbackHtml(success));
          settleSuccess(params);
        } catch (error) {
          response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          response.end("Authorization callback parsing failed.");
          settleError(error);
        }
      });
      server.on("error", (error) => {
        reject(error);
      });
      server.listen(0, LOOPBACK_HOST, () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("Failed to create the Google OAuth loopback listener."));
          return;
        }
        resolve(`http://${LOOPBACK_HOST}:${address.port}${LOOPBACK_PATH}`);
      });
    });
    timer = setTimeout(() => {
      settleError(
        new Error("Google sign-in timed out before the browser returned to localhost.")
      );
    }, LOOPBACK_TIMEOUT_MS);
    return {
      redirectUri,
      waitForCallback: () => callbackPromise,
      close
    };
  }
  async finishSignIn(params, verifier, expectedState, redirectUri) {
    if (params.error) {
      throw new Error(params.error_description || params.error);
    }
    if (!params.code) {
      throw new Error("Google did not return an authorization code.");
    }
    if (params.state !== expectedState) {
      throw new Error("OAuth state mismatch. Start sign-in again.");
    }
    const tokenSet = await this.exchangeCodeForTokens(params.code, verifier, redirectUri);
    await this.saveStoredTokens(tokenSet);
    this.settings.lastAuthError = "";
    await this.saveSettings();
  }
  async exchangeCodeForTokens(code, verifier, redirectUri) {
    const params = {
      client_id: this.settings.clientId.trim(),
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    };
    if (this.settings.clientSecret.trim()) {
      params.client_secret = this.settings.clientSecret.trim();
    }
    const body = new URLSearchParams(params).toString();
    const response = await requestUrl({
      url: GOOGLE_TOKEN_URL,
      method: "POST",
      contentType: "application/x-www-form-urlencoded",
      body,
      throw: false
    });
    if (response.status >= 400) {
      throw new Error(extractHttpError(response));
    }
    return buildStoredTokenPayload(parseJsonResponse(response));
  }
  async refreshTokens(refreshToken) {
    const params = {
      client_id: this.settings.clientId.trim(),
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    };
    if (this.settings.clientSecret.trim()) {
      params.client_secret = this.settings.clientSecret.trim();
    }
    const body = new URLSearchParams(params).toString();
    const response = await requestUrl({
      url: GOOGLE_TOKEN_URL,
      method: "POST",
      contentType: "application/x-www-form-urlencoded",
      body,
      throw: false
    });
    if (response.status >= 400) {
      throw new Error(extractHttpError(response));
    }
    const refreshed = buildStoredTokenPayload(parseJsonResponse(response));
    if (!refreshed.refreshToken) {
      refreshed.refreshToken = refreshToken;
    }
    await this.saveStoredTokens(refreshed);
    return refreshed;
  }
  async saveStoredTokens(tokenSet) {
    if (!tokenSet || !tokenSet.accessToken) {
      throw new Error("Google OAuth token exchange did not return an access token.");
    }
    this.cachedTokens = tokenSet || null;
    this.settings.storedTokensFallback = tokenSet || null;
    if (this.app.secretStorage) {
      try {
        this.app.secretStorage.setSecret(TOKEN_SECRET_ID, JSON.stringify(tokenSet || {}));
      } catch (error) {
        console.error("Failed to store Google token in secretStorage", error);
      }
    }
    await this.saveSettings();
  }
  loadStoredTokens() {
    if (this.cachedTokens && this.cachedTokens.accessToken) {
      return this.cachedTokens;
    }
    if (!this.app.secretStorage) {
      return null;
    }
    const raw = this.app.secretStorage.getSecret(TOKEN_SECRET_ID);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      this.cachedTokens = parsed;
      return parsed;
    } catch (_error) {
      return this.settings.storedTokensFallback || null;
    }
  }
  async clearStoredTokens() {
    this.cachedTokens = null;
    this.settings.storedTokensFallback = null;
    this.settings.lastAuthError = "";
    if (this.app.secretStorage) {
      this.app.secretStorage.setSecret(TOKEN_SECRET_ID, "");
    }
    await this.saveSettings();
  }
  buildSetupBundle() {
    const storedTokens = this.loadStoredTokens();
    if (!storedTokens || !storedTokens.refreshToken) {
      throw new Error("Sign in on desktop first, then export the setup bundle.");
    }
    return {
      version: SETUP_BUNDLE_VERSION,
      provider: "google-drive-mirror",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      config: {
        clientId: this.settings.clientId,
        clientSecret: this.settings.clientSecret,
        remoteVaultName: this.settings.remoteVaultName,
        includeExtensions: this.settings.includeExtensions,
        excludedPathPrefixes: this.settings.excludedPathPrefixes,
        syncObsidianFiles: this.settings.syncObsidianFiles,
        obsidianAllowlist: this.settings.obsidianAllowlist
      },
      tokens: storedTokens
    };
  }
  buildSetupBundlePayload(pretty) {
    return JSON.stringify(this.buildSetupBundle(), null, pretty ? 2 : 0);
  }
  buildSetupBundleImportUrl() {
    const encodedBundle = base64UrlEncodeUtf8(this.buildSetupBundlePayload(false));
    return `obsidian://${IMPORT_BUNDLE_ACTION}?bundle=${encodeURIComponent(encodedBundle)}`;
  }
  async copySetupBundle() {
    const payload = this.buildSetupBundlePayload(true);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        new Notice("Google Drive setup bundle copied to clipboard.", 8e3);
        return;
      }
    } catch (error) {
      console.warn("Clipboard copy failed, falling back to modal.", error);
    }
    new SetupBundleExportModal(this.app, payload).open();
  }
  async showSetupBundleQr() {
    const url = this.buildSetupBundleImportUrl();
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8
    });
    new SetupBundleQrModal(this.app, dataUrl, url).open();
  }
  async openImportSetupBundleModal() {
    new SetupBundleImportModal(this.app, async (raw) => {
      await this.importSetupBundle(raw);
    }).open();
  }
  async importSetupBundle(raw) {
    let parsed = null;
    try {
      parsed = JSON.parse(String(raw || ""));
    } catch (_error) {
      throw new Error("The setup bundle is not valid JSON.");
    }
    if (!parsed || parsed.provider !== "google-drive-mirror") {
      throw new Error("The setup bundle is not for Google Drive Mirror.");
    }
    if (Number(parsed.version || 0) !== SETUP_BUNDLE_VERSION) {
      throw new Error("Unsupported setup bundle version.");
    }
    const config = parsed.config || {};
    const tokens = normalizeImportedTokenSet(parsed.tokens || {});
    if (!config.clientId || !tokens.accessToken || !tokens.refreshToken) {
      throw new Error("The setup bundle is missing client or token data.");
    }
    this.settings.clientId = String(config.clientId || "").trim();
    this.settings.clientSecret = String(config.clientSecret || "").trim();
    this.settings.remoteVaultName = sanitizeDriveFolderName(
      String(config.remoteVaultName || this.defaultRemoteVaultName())
    );
    this.settings.includeExtensions = String(
      config.includeExtensions || DEFAULT_INCLUDE_EXTENSIONS
    );
    this.settings.excludedPathPrefixes = String(
      config.excludedPathPrefixes || DEFAULT_EXCLUDED_PREFIXES
    );
    this.settings.syncObsidianFiles = Boolean(config.syncObsidianFiles);
    this.settings.obsidianAllowlist = String(
      config.obsidianAllowlist || DEFAULT_OBSIDIAN_ALLOWLIST
    );
    this.settings.lastRemoteFolderId = "";
    this.remoteRootFolderCache = null;
    await this.saveStoredTokens(tokens);
    this.settings.lastAuthError = "";
    await this.saveSettings();
    new Notice("Google Drive setup bundle imported.", 8e3);
  }
  async handleImportBundleProtocol(params) {
    const encodedBundle = String(params?.bundle || "").trim();
    if (!encodedBundle) {
      throw new Error("Import link is missing the setup bundle payload.");
    }
    const bundlePayload = base64UrlDecodeUtf8(decodeURIComponent(encodedBundle));
    await this.importSetupBundle(bundlePayload);
  }
  async getValidAccessToken(forceRefresh) {
    if (this.pendingAuthPromise) {
      await this.pendingAuthPromise;
    }
    const stored = this.loadStoredTokens();
    if (!stored || !stored.accessToken) {
      throw new Error("You are not signed in to Google Drive.");
    }
    const expiresAt = Number(stored.expiresAt || 0);
    const needsRefresh = forceRefresh || !expiresAt || Date.now() >= expiresAt - 60 * 1e3;
    if (!needsRefresh) {
      return stored.accessToken;
    }
    if (!stored.refreshToken) {
      throw new Error("Refresh token is missing. Sign in again.");
    }
    const refreshed = await this.refreshTokens(stored.refreshToken);
    return refreshed.accessToken;
  }
  async requireConfigured(requireClientId) {
    if (requireClientId && !this.settings.clientId.trim()) {
      throw new Error("Set your Google OAuth Desktop App client ID in plugin settings first.");
    }
  }
  async pushActiveFile() {
    await this.runOperation("pushing active file", async () => {
      await this.requireConfigured(true);
      const file = this.app.workspace.getActiveFile();
      if (!(file instanceof TFile)) {
        throw new Error("No active file to push.");
      }
      if (!this.shouldSyncPath(file.path)) {
        throw new Error("The active file is outside the current sync allow-list.");
      }
      const previousLocal = this.settings.lastLocalManifest[file.path] || null;
      const localEntry = await this.buildLocalEntry(file, previousLocal);
      const remoteManifest = await this.loadRemoteManifestOrScan();
      const remoteEntry = remoteManifest[file.path] || null;
      let uploaded = 0;
      if (!remoteEntry || !sameRevision(localEntry, remoteEntry)) {
        remoteManifest[file.path] = await this.uploadLocalEntry(localEntry, remoteEntry);
        uploaded += 1;
      }
      await this.saveRemoteManifest(remoteManifest);
      const currentLocal = await this.buildLocalManifest(this.settings.lastLocalManifest);
      this.settings.lastLocalManifest = currentLocal;
      this.settings.lastRemoteManifest = remoteManifest;
      this.settings.lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
      await this.saveSettings();
      new Notice(`Push current file finished. Uploaded ${uploaded}.`);
    });
  }
  async pushAllChanges() {
    await this.runOperation("pushing local changes", async () => {
      await this.requireConfigured(true);
      const localManifest = await this.buildLocalManifest(this.settings.lastLocalManifest);
      const remoteManifest = await this.loadRemoteManifestOrScan();
      let uploaded = 0;
      let deleted = 0;
      const allPaths = /* @__PURE__ */ new Set([
        ...Object.keys(localManifest),
        ...Object.keys(remoteManifest)
      ]);
      for (const path of allPaths) {
        const localEntry = localManifest[path] || null;
        const remoteEntry = remoteManifest[path] || null;
        if (localEntry && (!remoteEntry || !sameRevision(localEntry, remoteEntry))) {
          remoteManifest[path] = await this.uploadLocalEntry(localEntry, remoteEntry);
          uploaded += 1;
          continue;
        }
        if (!localEntry && remoteEntry) {
          await this.deleteRemotePath(path, remoteEntry);
          delete remoteManifest[path];
          deleted += 1;
        }
      }
      await this.saveRemoteManifest(remoteManifest);
      this.settings.lastLocalManifest = localManifest;
      this.settings.lastRemoteManifest = remoteManifest;
      this.settings.lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
      await this.saveSettings();
      new Notice(`Push finished. Uploaded ${uploaded}, deleted ${deleted}.`, 8e3);
    });
  }
  async pullRemoteChanges() {
    await this.runOperation("pulling remote changes", async () => {
      await this.requireConfigured(true);
      const localManifest = await this.buildLocalManifest(this.settings.lastLocalManifest);
      const remoteManifest = await this.loadRemoteManifestOrScan();
      let downloaded = 0;
      let deleted = 0;
      const allPaths = /* @__PURE__ */ new Set([
        ...Object.keys(localManifest),
        ...Object.keys(remoteManifest)
      ]);
      for (const path of allPaths) {
        const remoteEntry = remoteManifest[path] || null;
        const localEntry = localManifest[path] || null;
        if (remoteEntry && (!localEntry || !sameRevision(localEntry, remoteEntry))) {
          await this.downloadIntoCanonicalPath(path, remoteEntry);
          downloaded += 1;
          continue;
        }
        if (!remoteEntry && localEntry) {
          await this.deleteLocalPath(path);
          deleted += 1;
        }
      }
      const refreshedLocalManifest = await this.buildLocalManifest(localManifest);
      this.settings.lastLocalManifest = refreshedLocalManifest;
      this.settings.lastRemoteManifest = remoteManifest;
      this.settings.lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
      await this.saveSettings();
      new Notice(`Pull finished. Downloaded ${downloaded}, deleted ${deleted}.`, 8e3);
    });
  }
  async buildLocalManifest(previousManifest) {
    const manifest = {};
    const files = this.app.vault.getFiles();
    for (const file of files) {
      if (!this.shouldSyncPath(file.path)) {
        continue;
      }
      const previousEntry = previousManifest ? previousManifest[file.path] : null;
      manifest[file.path] = await this.buildLocalEntry(file, previousEntry);
    }
    return manifest;
  }
  async buildLocalEntry(file, previousEntry) {
    const kind = this.detectFileKind(file.path);
    const size = Number(file.stat.size || 0);
    const mtime = Number(file.stat.mtime || 0);
    if (previousEntry && previousEntry.kind === kind && Number(previousEntry.size || 0) === size && Number(previousEntry.mtime || 0) === mtime && previousEntry.sha256) {
      return {
        path: file.path,
        kind,
        size,
        mtime,
        sha256: previousEntry.sha256
      };
    }
    const contents = kind === "text" ? await this.app.vault.read(file) : await this.app.vault.readBinary(file);
    const sha256 = await sha256Of(contents);
    return {
      path: file.path,
      kind,
      size,
      mtime,
      sha256
    };
  }
  shouldSyncPath(path) {
    const normalized = normalizePath(path);
    const configDir = normalizePath(this.app.vault.configDir || ".obsidian");
    const pluginPrefix = normalizePath(`${configDir}/plugins/${this.manifest.id}`);
    const basename = getBasename(normalized);
    if (basename.includes(".conflict-")) {
      return false;
    }
    if (normalized.startsWith(`${pluginPrefix}/`) || normalized === pluginPrefix) {
      return false;
    }
    const excludedPrefixes = parseMultilineList(this.settings.excludedPathPrefixes).map(
      (item) => stripTrailingSlash(item)
    );
    for (const prefix of excludedPrefixes) {
      if (!prefix) {
        continue;
      }
      const normalizedPrefix = normalizePath(prefix);
      if (normalized === normalizedPrefix || normalized.startsWith(`${normalizedPrefix}/`)) {
        return false;
      }
    }
    if (normalized === configDir || normalized.startsWith(`${configDir}/`)) {
      if (!this.settings.syncObsidianFiles) {
        return false;
      }
      const relativeConfigPath = normalized.slice(configDir.length + 1);
      if (!relativeConfigPath) {
        return false;
      }
      if (relativeConfigPath.startsWith(`plugins/${this.manifest.id}/`)) {
        return false;
      }
      const allowlist = parseMultilineList(this.settings.obsidianAllowlist);
      if (allowlist.includes("*")) {
        return true;
      }
      return allowlist.some((allowed) => {
        const normalizedAllowed = stripTrailingSlash(normalizePath(allowed));
        return relativeConfigPath === normalizedAllowed || relativeConfigPath.startsWith(`${normalizedAllowed}/`);
      });
    }
    const extension = getExtension(normalized);
    const allowedExtensions = new Set(
      parseCommaSeparatedList(this.settings.includeExtensions).map(
        (item) => item.toLowerCase()
      )
    );
    return allowedExtensions.has(extension);
  }
  detectFileKind(path) {
    return TEXT_EXTENSIONS.has(getExtension(path)) ? "text" : "binary";
  }
  getRemoteRootFolderName() {
    return sanitizeDriveFolderName(
      this.settings.remoteVaultName.trim() || this.defaultRemoteVaultName()
    );
  }
  getRemoteManifestPath() {
    return REMOTE_MANIFEST_NAME;
  }
  getRemoteCanonicalPath(localPath) {
    return normalizePath(localPath);
  }
  getRemoteConflictPath(localPath) {
    return normalizePath(`${REMOTE_CONFLICTS_DIR}/${makeConflictPath(localPath, "local")}`);
  }
  async loadRemoteManifestOrScan() {
    const manifest = await this.loadRemoteManifest();
    try {
      const scanned = await this.scanRemoteVault();
      return mergeRemoteScanWithManifest(scanned, manifest);
    } catch (error) {
      if (manifest) {
        console.warn("Falling back to stored remote manifest after scan failure.", error);
        return manifest;
      }
      throw error;
    }
  }
  async loadRemoteManifest() {
    const item = await this.findRemoteFileByPath(this.getRemoteManifestPath());
    if (!item) {
      return null;
    }
    const text = await this.downloadDriveText(item.id);
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.error("Failed to parse remote manifest", error);
      return null;
    }
    if (!parsed || parsed.version !== REMOTE_MANIFEST_VERSION || !parsed.files) {
      return null;
    }
    return parsed.files;
  }
  async saveRemoteManifest(files) {
    const payload = {
      version: REMOTE_MANIFEST_VERSION,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      remoteVaultName: this.settings.remoteVaultName,
      files
    };
    const text = JSON.stringify(payload, null, 2);
    const driveItem = await this.upsertDriveFileByPath(
      this.getRemoteManifestPath(),
      text,
      "application/json; charset=utf-8"
    );
    return driveItem;
  }
  async scanRemoteVault() {
    const items = await this.listAllRemoteFiles();
    const files = {};
    for (const item of items) {
      if (item.remotePath === this.getRemoteManifestPath() || item.remotePath.startsWith(`${REMOTE_CONFLICTS_DIR}/`)) {
        continue;
      }
      const existing = files[item.remotePath];
      if (existing && normalizeComparableMtime(existing.mtime) >= normalizeComparableMtime(item.modifiedTime)) {
        continue;
      }
      files[item.remotePath] = {
        path: item.remotePath,
        kind: this.detectFileKind(item.remotePath),
        size: Number(item.size || 0),
        mtime: item.modifiedTime || null,
        sha256: null,
        itemId: item.id
      };
    }
    return files;
  }
  async uploadLocalEntry(localEntry, remoteEntry) {
    const body = localEntry.kind === "text" ? await this.readLocalText(localEntry.path) : await this.readLocalBytes(localEntry.path);
    const contentType = localEntry.kind === "text" ? "text/plain; charset=utf-8" : "application/octet-stream";
    const driveItem = await this.upsertDriveFileByPath(
      this.getRemoteCanonicalPath(localEntry.path),
      body,
      contentType,
      remoteEntry ? remoteEntry.itemId : null
    );
    return {
      path: localEntry.path,
      kind: localEntry.kind,
      size: Number(driveItem.size || localEntry.size),
      mtime: driveItem.modifiedTime || (/* @__PURE__ */ new Date()).toISOString(),
      sha256: localEntry.sha256,
      itemId: driveItem.id
    };
  }
  async uploadRemoteConflictCopy(localEntry) {
    const body = localEntry.kind === "text" ? await this.readLocalText(localEntry.path) : await this.readLocalBytes(localEntry.path);
    const contentType = localEntry.kind === "text" ? "text/plain; charset=utf-8" : "application/octet-stream";
    await this.createDriveFileAtPath(
      this.getRemoteConflictPath(localEntry.path),
      body,
      contentType
    );
  }
  async downloadRemoteConflictCopy(path, remoteEntry) {
    const payload = await this.downloadRemotePayload(remoteEntry);
    const conflictPath = makeConflictPath(path, "remote");
    await this.writeLocalEntry(
      conflictPath,
      remoteEntry.kind || this.detectFileKind(path),
      payload.data,
      payload.mtime
    );
  }
  async downloadIntoCanonicalPath(path, remoteEntry) {
    const payload = await this.downloadRemotePayload(remoteEntry);
    await this.writeLocalEntry(
      path,
      remoteEntry.kind || this.detectFileKind(path),
      payload.data,
      payload.mtime
    );
  }
  async downloadRemotePayload(remoteEntry) {
    const fileId = remoteEntry.itemId || await this.findRemoteIdByPath(this.getRemoteCanonicalPath(remoteEntry.path));
    if (!fileId) {
      throw new Error(`Remote file not found: ${remoteEntry.path}`);
    }
    const metadata = await this.getDriveFileMetadata(fileId);
    const response = await this.googleRequest({
      path: `/files/${fileId}?alt=media`,
      method: "GET"
    });
    if ((remoteEntry.kind || this.detectFileKind(remoteEntry.path)) === "text") {
      return {
        data: response.text,
        mtime: metadata.modifiedTime || remoteEntry.mtime || null
      };
    }
    return {
      data: response.arrayBuffer,
      mtime: metadata.modifiedTime || remoteEntry.mtime || null
    };
  }
  async downloadDriveText(fileId) {
    const response = await this.googleRequest({
      path: `/files/${fileId}?alt=media`,
      method: "GET"
    });
    return response.text;
  }
  async writeLocalEntry(path, kind, data, mtimeIso) {
    const normalized = normalizePath(path);
    await this.ensureLocalFolder(getDirname(normalized));
    const existing = this.app.vault.getFileByPath(normalized);
    const writeOptions = {};
    if (mtimeIso) {
      const parsedMtime = Date.parse(mtimeIso);
      if (!Number.isNaN(parsedMtime)) {
        writeOptions.mtime = parsedMtime;
      }
    }
    if (kind === "text") {
      if (existing) {
        await this.app.vault.modify(existing, data, writeOptions);
      } else {
        await this.app.vault.create(normalized, data, writeOptions);
      }
      return;
    }
    if (existing) {
      await this.app.vault.modifyBinary(existing, data, writeOptions);
    } else {
      await this.app.vault.createBinary(normalized, data, writeOptions);
    }
  }
  async deleteLocalPath(path) {
    const normalized = normalizePath(path);
    const existing = this.app.vault.getAbstractFileByPath(normalized);
    if (!existing) {
      return;
    }
    await this.app.vault.delete(existing, true);
  }
  async ensureLocalFolder(folderPath) {
    if (!folderPath) {
      return;
    }
    const segments = normalizePath(folderPath).split("/");
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (!this.app.vault.getFolderByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }
  async readLocalText(path) {
    const file = this.app.vault.getFileByPath(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return await this.app.vault.read(file);
  }
  async readLocalBytes(path) {
    const file = this.app.vault.getFileByPath(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return await this.app.vault.readBinary(file);
  }
  async listAllRemoteFiles() {
    const rootId = await this.ensureRemoteRootFolderId();
    return await this.listRemoteFilesRecursively(rootId, "");
  }
  async listRemoteFilesRecursively(parentId, currentPath) {
    const files = [];
    const children = await this.listDriveChildren(parentId);
    for (const child of children) {
      const childPath = currentPath ? normalizePath(`${currentPath}/${child.name}`) : child.name;
      if (child.mimeType === DRIVE_FOLDER_MIME_TYPE) {
        files.push(...await this.listRemoteFilesRecursively(child.id, childPath));
        continue;
      }
      files.push(
        Object.assign({}, child, {
          remotePath: childPath
        })
      );
    }
    return files;
  }
  async listDriveChildren(parentId) {
    const files = [];
    let pageToken = null;
    do {
      const params = new URLSearchParams({
        pageSize: "1000",
        fields: "nextPageToken,files(id,name,mimeType,modifiedTime,size,parents)",
        q: [
          `'${escapeDriveQueryLiteral(parentId)}' in parents`,
          "trashed = false"
        ].join(" and "),
        orderBy: "name"
      });
      if (pageToken) {
        params.set("pageToken", pageToken);
      }
      const response = await this.googleRequest({
        path: `/files?${params.toString()}`,
        method: "GET"
      });
      const json = response.json || {};
      files.push(...Array.isArray(json.files) ? json.files : []);
      pageToken = json.nextPageToken || null;
    } while (pageToken);
    return files;
  }
  async ensureRemoteRootFolderId() {
    const folderName = this.getRemoteRootFolderName();
    if (this.remoteRootFolderCache && this.remoteRootFolderCache.name === folderName && this.remoteRootFolderCache.id) {
      return this.remoteRootFolderCache.id;
    }
    const existing = await this.findChildByName("root", folderName, DRIVE_FOLDER_MIME_TYPE);
    if (existing) {
      await this.rememberRemoteRootFolder(existing.id, folderName);
      return existing.id;
    }
    const created = await this.createDriveFolder(folderName, "root");
    await this.rememberRemoteRootFolder(created.id, folderName);
    return created.id;
  }
  async ensureRemoteFolderPath(relativeDirPath) {
    const rootId = await this.ensureRemoteRootFolderId();
    if (!relativeDirPath) {
      return rootId;
    }
    const segments = normalizePath(relativeDirPath).split("/").filter((segment) => Boolean(segment));
    let currentParentId = rootId;
    for (const segment of segments) {
      let child = await this.findChildByName(currentParentId, segment, DRIVE_FOLDER_MIME_TYPE);
      if (!child) {
        child = await this.createDriveFolder(segment, currentParentId);
      }
      currentParentId = child.id;
    }
    return currentParentId;
  }
  async findRemoteFileByPath(remotePath) {
    const normalized = stripLeadingSlash(normalizePath(remotePath || ""));
    if (!normalized) {
      return null;
    }
    const segments = normalized.split("/").filter((segment) => Boolean(segment));
    let parentId = await this.ensureRemoteRootFolderId();
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const isLeaf = index === segments.length - 1;
      const item = await this.findChildByName(
        parentId,
        segment,
        isLeaf ? null : DRIVE_FOLDER_MIME_TYPE
      );
      if (!item) {
        return null;
      }
      parentId = item.id;
      if (isLeaf) {
        return item;
      }
    }
    return null;
  }
  async findChildByName(parentId, name, mimeType) {
    const query = [
      `name = '${escapeDriveQueryLiteral(name)}'`,
      `'${escapeDriveQueryLiteral(parentId)}' in parents`,
      "trashed = false"
    ].join(" and ");
    const normalizedQuery = mimeType ? `${query} and mimeType = '${escapeDriveQueryLiteral(mimeType)}'` : query;
    const params = new URLSearchParams({
      pageSize: "10",
      orderBy: "modifiedTime desc",
      fields: "files(id,name,mimeType,modifiedTime,size,parents)",
      q: normalizedQuery
    });
    const response = await this.googleRequest({
      path: `/files?${params.toString()}`,
      method: "GET"
    });
    const files = Array.isArray(response.json?.files) ? response.json.files : [];
    return files[0] || null;
  }
  async findRemoteIdByPath(path) {
    const item = await this.findRemoteFileByPath(path);
    return item ? item.id : null;
  }
  async getDriveFileMetadata(fileId) {
    const params = new URLSearchParams({
      fields: "id,name,mimeType,modifiedTime,size"
    });
    const response = await this.googleRequest({
      path: `/files/${fileId}?${params.toString()}`,
      method: "GET"
    });
    return response.json || {};
  }
  async deleteRemotePath(remotePath, remoteEntry) {
    const fileId = remoteEntry?.itemId || await this.findRemoteIdByPath(this.getRemoteCanonicalPath(remotePath));
    if (!fileId) {
      return;
    }
    await this.googleRequest({
      path: `/files/${fileId}`,
      method: "DELETE"
    });
  }
  async upsertDriveFileByPath(remotePath, data, contentType, knownId) {
    let fileId = knownId || null;
    if (!fileId) {
      const existing = await this.findRemoteFileByPath(remotePath);
      fileId = existing ? existing.id : null;
    }
    if (fileId) {
      return await this.updateDriveFile(fileId, data, contentType);
    }
    return await this.createDriveFileAtPath(remotePath, data, contentType);
  }
  async createDriveFolder(name, parentId) {
    const response = await this.googleRequest({
      path: "/files?fields=id,name,mimeType,modifiedTime,size",
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        name,
        parents: [parentId],
        mimeType: DRIVE_FOLDER_MIME_TYPE
      })
    });
    return response.json || {};
  }
  async createDriveFileAtPath(remotePath, data, contentType) {
    const normalized = stripLeadingSlash(normalizePath(remotePath));
    const parentPath = getDirname(normalized);
    const fileName = getBasename(normalized);
    const parentId = await this.ensureRemoteFolderPath(parentPath);
    const metadataResponse = await this.googleRequest({
      path: "/files?fields=id,name,mimeType,modifiedTime,size",
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        name: fileName,
        parents: [parentId],
        mimeType: contentType.split(";")[0]
      })
    });
    const created = metadataResponse.json || {};
    return await this.updateDriveFile(created.id, data, contentType);
  }
  async updateDriveFile(fileId, data, contentType) {
    const response = await this.googleRequest({
      url: `${GOOGLE_DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime,size`,
      method: "PATCH",
      contentType,
      body: data
    });
    return response.json || {};
  }
  async googleRequest(options, retried) {
    const headers = Object.assign({}, options.headers || {});
    const url = options.url || `${GOOGLE_DRIVE_API}${options.path}`;
    headers.Authorization = `Bearer ${await this.getValidAccessToken(false)}`;
    const response = await requestUrl({
      url,
      method: options.method || "GET",
      headers,
      contentType: options.contentType,
      body: options.body,
      throw: false
    });
    if (response.status === 401 && !retried) {
      await this.getValidAccessToken(true);
      return await this.googleRequest(options, true);
    }
    if (response.status >= 400) {
      throw new Error(extractHttpError(response));
    }
    return response;
  }
  recomputeSyncedState(previousLocalState, previousRemoteState, localManifest, remoteManifest) {
    const nextLocal = Object.assign({}, previousLocalState || {});
    const nextRemote = Object.assign({}, previousRemoteState || {});
    const allPaths = /* @__PURE__ */ new Set([
      ...Object.keys(previousLocalState || {}),
      ...Object.keys(previousRemoteState || {}),
      ...Object.keys(localManifest || {}),
      ...Object.keys(remoteManifest || {})
    ]);
    for (const path of allPaths) {
      const localEntry = localManifest[path] || null;
      const remoteEntry = remoteManifest[path] || null;
      if (!localEntry && !remoteEntry) {
        delete nextLocal[path];
        delete nextRemote[path];
        continue;
      }
      if (localEntry && remoteEntry && sameRevision(localEntry, remoteEntry)) {
        nextLocal[path] = {
          path,
          kind: localEntry.kind,
          size: localEntry.size,
          mtime: localEntry.mtime,
          sha256: localEntry.sha256
        };
        nextRemote[path] = {
          path,
          kind: remoteEntry.kind,
          size: remoteEntry.size,
          mtime: remoteEntry.mtime,
          sha256: remoteEntry.sha256,
          itemId: remoteEntry.itemId || null
        };
      }
    }
    return { local: nextLocal, remote: nextRemote };
  }
  formatError(error) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return String(error || "Unknown error");
  }
};
var GoogleDriveMirrorSettingTab = class extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Google Drive Mirror" });
    containerEl.createEl("p", {
      text: "Desktop signs in with Google once, then every device can manually Push/Pull against the same visible folder in My Drive. iPhone/iPad should import a setup bundle exported from desktop."
    });
    new Setting(containerEl).setName("Client ID").setDesc("Google OAuth client ID for a Desktop app.").addText(
      (text) => text.setPlaceholder("1234567890-abcdef.apps.googleusercontent.com").setValue(this.plugin.settings.clientId).onChange(async (value) => {
        this.plugin.settings.clientId = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new Setting(containerEl).setName("Client Secret").setDesc("Google OAuth Desktop App client secret. Some Google clients still require it during token exchange.").addText(
      (text) => text.setPlaceholder("GOCSPX-...").setValue(this.plugin.settings.clientSecret).onChange(async (value) => {
        this.plugin.settings.clientSecret = value.trim();
        await this.plugin.saveSettings();
      })
    );
    const storedTokens = this.plugin.loadStoredTokens();
    const authState = storedTokens && storedTokens.accessToken ? "Signed in" : "Not signed in";
    const authDesc = storedTokens && storedTokens.expiresAt ? `Current token expires around ${new Date(storedTokens.expiresAt).toLocaleString()}.` : "No Google OAuth token is currently stored.";
    new Setting(containerEl).setName("Auth status").setDesc(authDesc).addExtraButton((button) => {
      button.setIcon(storedTokens && storedTokens.accessToken ? "check-circle" : "alert-circle");
      button.setTooltip(authState);
    });
    if (this.plugin.settings.lastAuthError) {
      new Setting(containerEl).setName("Last auth error").setDesc(this.plugin.settings.lastAuthError).addExtraButton((button) => {
        button.setIcon("alert-triangle");
        button.setTooltip("Last Google OAuth error");
      });
    }
    const redirectDescription = containerEl.createDiv();
    redirectDescription.createEl("div", {
      text: "The plugin starts a temporary loopback listener automatically during sign-in:"
    });
    redirectDescription.createEl("code", {
      text: "http://127.0.0.1:{random-port}/oauth2callback"
    });
    new Setting(containerEl).setName("OAuth redirect").setDesc(redirectDescription).addExtraButton((button) => {
      button.setIcon("info").setTooltip(
        "Google Desktop App OAuth uses a temporary localhost callback."
      );
    });
    new Setting(containerEl).setName("Remote vault name").setDesc("Visible folder name in My Drive. The plugin mirrors your vault under this folder.").addText(
      (text) => text.setPlaceholder(this.plugin.defaultRemoteVaultName()).setValue(this.plugin.settings.remoteVaultName).onChange(async (value) => {
        this.plugin.settings.remoteVaultName = sanitizeDriveFolderName(value.trim() || this.plugin.defaultRemoteVaultName());
        this.plugin.remoteRootFolderCache = null;
        this.plugin.settings.lastRemoteFolderId = "";
        await this.plugin.saveSettings();
      })
    );
    const remoteFolderUrl = this.plugin.getRemoteFolderUrl();
    new Setting(containerEl).setName("Remote folder").setDesc(
      remoteFolderUrl ? `Open the visible Google Drive folder: ${remoteFolderUrl}` : "The visible Google Drive folder will appear here after the first successful push."
    ).addButton((button) => {
      button.setButtonText("Open folder").setDisabled(!remoteFolderUrl).onClick(() => {
        this.plugin.openRemoteFolderUrl();
      });
    });
    new Setting(containerEl).setName("Device setup bundle").setDesc(
      "Sign in once on desktop, then copy this bundle and import it on iPhone/iPad to reuse the same Google Drive connection."
    ).addButton((button) => {
      button.setButtonText("Copy bundle").onClick(async () => {
        try {
          await this.plugin.copySetupBundle();
        } catch (error) {
          new Notice(this.plugin.formatError(error), 8e3);
        }
      });
    }).addButton((button) => {
      button.setButtonText("Import bundle").onClick(async () => {
        try {
          await this.plugin.openImportSetupBundleModal();
        } catch (error) {
          new Notice(this.plugin.formatError(error), 8e3);
        }
      });
    }).addButton((button) => {
      button.setButtonText("Show QR").setDisabled(!Platform.isDesktopApp).onClick(async () => {
        try {
          await this.plugin.showSetupBundleQr();
        } catch (error) {
          new Notice(this.plugin.formatError(error), 8e3);
        }
      });
    });
    new Setting(containerEl).setName("Manual sync policy").setDesc(
      "Push all mirrors this device to Drive. Pull all mirrors Drive to this device. Manual sync overwrites target-side edits and deletions."
    );
    new Setting(containerEl).setName("Allowed file extensions").setDesc(
      "Comma-separated. Files outside this list are ignored unless matched by the .obsidian allow-list."
    ).addTextArea(
      (text) => text.setValue(this.plugin.settings.includeExtensions).onChange(async (value) => {
        this.plugin.settings.includeExtensions = value;
        await this.plugin.saveSettings();
      })
    );
    new Setting(containerEl).setName("Excluded path prefixes").setDesc("One per line, relative to the vault root.").addTextArea(
      (text) => text.setValue(this.plugin.settings.excludedPathPrefixes).onChange(async (value) => {
        this.plugin.settings.excludedPathPrefixes = value;
        await this.plugin.saveSettings();
      })
    );
    new Setting(containerEl).setName("Sync selected .obsidian files").setDesc("Disabled by default to avoid syncing per-device workspace state.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.syncObsidianFiles).onChange(async (value) => {
        this.plugin.settings.syncObsidianFiles = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.syncObsidianFiles) {
      new Setting(containerEl).setName(".obsidian allow-list").setDesc("One per line, relative to .obsidian. Use * to allow everything inside .obsidian.").addTextArea(
        (text) => text.setValue(this.plugin.settings.obsidianAllowlist).onChange(async (value) => {
          this.plugin.settings.obsidianAllowlist = value;
          await this.plugin.saveSettings();
        })
      );
    }
    new Setting(containerEl).setName("Sign in").setDesc(
      Platform.isDesktopApp ? "On desktop, opens Google OAuth in your default browser." : "On iPhone/iPad, use Import bundle instead of browser sign-in."
    ).addButton(
      (button) => button.setButtonText("Start sign-in").setDisabled(!Platform.isDesktopApp).onClick(async () => {
        await this.plugin.beginSignIn();
      })
    ).addButton(
      (button) => button.setButtonText("Clear auth").setWarning().onClick(async () => {
        await this.plugin.clearStoredTokens();
        new Notice("Google Drive sign-in cleared.");
      })
    );
    new Setting(containerEl).setName("Manual actions").setDesc("This phase keeps sync fully manual.").addButton(
      (button) => button.setButtonText("Push current").onClick(async () => {
        await this.plugin.pushActiveFile();
      })
    ).addButton(
      (button) => button.setButtonText("Push all").onClick(async () => {
        await this.plugin.pushAllChanges();
      })
    ).addButton(
      (button) => button.setButtonText("Pull all").onClick(async () => {
        await this.plugin.pullRemoteChanges();
      })
    );
  }
};
var SetupBundleExportModal = class extends Modal {
  constructor(app, payload) {
    super(app);
    this.payload = payload;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Google Drive setup bundle" });
    contentEl.createEl("p", {
      text: "Copy this bundle into another device running the same plugin. Treat it like a password because it contains a refresh token."
    });
    const textArea = contentEl.createEl("textarea");
    textArea.style.width = "100%";
    textArea.style.minHeight = "260px";
    textArea.value = this.payload;
    textArea.select();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var SetupBundleImportModal = class extends Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Import Google Drive setup bundle" });
    contentEl.createEl("p", {
      text: "Paste the bundle exported from your desktop device. This imports Google Drive credentials and sync settings."
    });
    const textArea = contentEl.createEl("textarea");
    textArea.style.width = "100%";
    textArea.style.minHeight = "260px";
    textArea.placeholder = "{ ... }";
    const actions = contentEl.createDiv();
    actions.style.marginTop = "1rem";
    actions.style.display = "flex";
    actions.style.gap = "0.75rem";
    const importButton = actions.createEl("button", { text: "Import" });
    importButton.addEventListener("click", async () => {
      try {
        await this.onSubmit(textArea.value);
        this.close();
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error), 8e3);
      }
    });
    const cancelButton = actions.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => {
      this.close();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var SetupBundleQrModal = class extends Modal {
  constructor(app, dataUrl, importUrl) {
    super(app);
    this.dataUrl = dataUrl;
    this.importUrl = importUrl;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Scan to import on iPhone / iPad" });
    contentEl.createEl("p", {
      text: "Open the camera on the other device, scan this QR code, then tap the obsidian:// link to import the setup bundle automatically."
    });
    const image = contentEl.createEl("img", {
      attr: {
        src: this.dataUrl,
        alt: "Google Drive setup bundle QR"
      }
    });
    image.style.width = "320px";
    image.style.maxWidth = "100%";
    image.style.display = "block";
    image.style.margin = "0 auto 1rem";
    const code = contentEl.createEl("code", { text: this.importUrl });
    code.style.display = "block";
    code.style.wordBreak = "break-all";
  }
  onClose() {
    this.contentEl.empty();
  }
};
function buildStoredTokenPayload(tokenResponse) {
  const expiresIn = Number(tokenResponse.expires_in || 3600);
  return {
    accessToken: tokenResponse.access_token || "",
    refreshToken: tokenResponse.refresh_token || "",
    expiresAt: Date.now() + expiresIn * 1e3,
    scope: tokenResponse.scope || "",
    tokenType: tokenResponse.token_type || "Bearer"
  };
}
function normalizeImportedTokenSet(tokenResponse) {
  if (tokenResponse && tokenResponse.accessToken) {
    return {
      accessToken: String(tokenResponse.accessToken || ""),
      refreshToken: String(
        tokenResponse.refreshToken || tokenResponse.refresh_token || ""
      ),
      expiresAt: Number(tokenResponse.expiresAt || Date.now() + 3600 * 1e3),
      scope: String(tokenResponse.scope || ""),
      tokenType: String(tokenResponse.tokenType || tokenResponse.token_type || "Bearer")
    };
  }
  const normalized = buildStoredTokenPayload(tokenResponse || {});
  normalized.refreshToken = String(
    tokenResponse?.refreshToken || tokenResponse?.refresh_token || normalized.refreshToken || ""
  );
  return normalized;
}
function sameRevision(left, right) {
  if (!left || !right) {
    return false;
  }
  if (left.sha256 && right.sha256) {
    return left.sha256 === right.sha256;
  }
  return String(left.kind || "") === String(right.kind || "") && Number(left.size || 0) === Number(right.size || 0) && normalizeComparableMtime(left.mtime) === normalizeComparableMtime(right.mtime);
}
function mergeRemoteScanWithManifest(scannedFiles, manifestFiles) {
  const merged = Object.assign({}, scannedFiles || {});
  const manifest = manifestFiles || {};
  for (const [path, scannedEntry] of Object.entries(merged)) {
    const manifestEntry = manifest[path];
    if (!manifestEntry) {
      continue;
    }
    if (!sameRevision(scannedEntry, manifestEntry)) {
      continue;
    }
    merged[path] = Object.assign({}, scannedEntry, {
      sha256: manifestEntry.sha256 || scannedEntry.sha256 || null,
      itemId: scannedEntry.itemId || manifestEntry.itemId || null
    });
  }
  return merged;
}
function normalizeComparableMtime(value) {
  if (value === null || value === void 0 || value === "") {
    return "";
  }
  if (typeof value === "number") {
    return String(Math.trunc(value));
  }
  const parsed = Date.parse(String(value));
  if (!Number.isNaN(parsed)) {
    return String(parsed);
  }
  return String(value);
}
async function sha256Of(value) {
  let buffer = null;
  if (typeof value === "string") {
    buffer = new TextEncoder().encode(value).buffer;
  } else if (value instanceof ArrayBuffer) {
    buffer = value;
  } else if (ArrayBuffer.isView(value)) {
    buffer = value.buffer;
  } else {
    throw new Error("Unsupported value for hashing.");
  }
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return arrayBufferToHex ? arrayBufferToHex(digest) : bufferToHex(digest);
}
function createPkceVerifier() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(64)));
}
async function createPkceChallenge(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return base64UrlEncode(new Uint8Array(digest));
}
function createRandomToken(bytes) {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}
function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64UrlEncodeUtf8(value) {
  return base64UrlEncode(new TextEncoder().encode(String(value || "")));
}
function base64UrlDecodeUtf8(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder("utf-8").decode(bytes);
}
function parseCommaSeparatedList(value) {
  return String(value || "").split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean);
}
function parseMultilineList(value) {
  return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}
function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/g, "");
}
function stripLeadingSlash(value) {
  return String(value || "").replace(/^\/+/g, "");
}
function sanitizeDriveFolderName(value) {
  return String(value || "").trim().replace(/[\\/]+/g, "-") || "default-vault";
}
function getExtension(path) {
  const basename = getBasename(path);
  const index = basename.lastIndexOf(".");
  if (index < 0) {
    return "";
  }
  return basename.slice(index + 1).toLowerCase();
}
function getDirname(path) {
  const normalized = normalizePath(path || "");
  const index = normalized.lastIndexOf("/");
  if (index < 0) {
    return "";
  }
  return normalized.slice(0, index);
}
function getBasename(path) {
  const normalized = normalizePath(path || "");
  const index = normalized.lastIndexOf("/");
  if (index < 0) {
    return normalized;
  }
  return normalized.slice(index + 1);
}
function makeConflictPath(originalPath, sourceLabel) {
  const normalized = normalizePath(originalPath);
  const dirname = getDirname(normalized);
  const basename = getBasename(normalized);
  const dotIndex = basename.lastIndexOf(".");
  const timestamp = timestampForConflicts();
  const stem = dotIndex >= 0 ? basename.slice(0, dotIndex) : basename;
  const extension = dotIndex >= 0 ? basename.slice(dotIndex) : "";
  const conflictName = `${stem}.conflict-${sourceLabel}-${timestamp}${extension}`;
  return dirname ? `${dirname}/${conflictName}` : conflictName;
}
function timestampForConflicts() {
  const now = /* @__PURE__ */ new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
}
function extractHttpError(response) {
  const json = response.json || {};
  if (json.error) {
    if (typeof json.error === "string") {
      return json.error_description || json.error;
    }
    if (json.error.message) {
      return json.error.message;
    }
  }
  if (json.error_description) {
    return json.error_description;
  }
  if (response.text) {
    return `${response.status}: ${response.text}`;
  }
  return `HTTP ${response.status}`;
}
function parseJsonResponse(response) {
  if (response && response.json && typeof response.json === "object") {
    return response.json;
  }
  if (response && response.text) {
    try {
      return JSON.parse(response.text);
    } catch (_error) {
      throw new Error(`Expected JSON response but received: ${response.text}`);
    }
  }
  throw new Error("Expected JSON response but received an empty body.");
}
function escapeDriveQueryLiteral(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function buildLoopbackCallbackHtml(success) {
  const title = success ? "Google authorization received" : "Google Drive sign-in failed";
  const body = success ? "Obsidian is finishing sign-in now. Wait for the confirmation notice in Obsidian, then close this tab." : "The browser returned an OAuth error. Check Obsidian for details, then try again.";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        margin: 0;
        padding: 2rem;
        background: #f6f7fb;
        color: #1e293b;
      }
      main {
        max-width: 42rem;
        margin: 0 auto;
        background: white;
        border-radius: 16px;
        padding: 1.5rem 1.75rem;
        box-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin-top: 0;
        font-size: 1.35rem;
      }
      p {
        margin-bottom: 0;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
    </main>
  </body>
</html>`;
}
