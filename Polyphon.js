/**********************************************************************
 Polyphon.js - A music generator and player in pure JS
***********************************************************************
Copyright (C) 2012 Darien Oliver Brown <unidyne AT gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
**********************************************************************/
/***
	TODO:
		* Support both WAV and AIF output
		* Method to get the audio data URI (think download links)
		* Use HTML5 audio control methods and callbacks for pausing and looping
		* Allow multiple tracks... is track synchronization possible?
		* More instruments and methods to register new ones at runtime
		* Non-music functionality for better sound control
		* Polyphonic tones with more than one instrument
***/

"use strict";

function atos(a) { return String.fromCharCode.apply(String, a); }

var Polyphon = new (function() {
	// Instruments
	var Instr = {
		square:		function(v,l){ var a = new Array(l); while(--l >= 0) a[l] = v; return a; },
		sawtooth:	function(v,l){ var a = new Array(l); var n = l; while(--n >= 0) a[n] = v - (v*(Math.abs(l/2-n)/l)-.5>>0); return a; },
		sine:		function(v,l){ var a = new Array(l); var n = l; while(--n >= 0) a[n] = 127+((v-127) * Math.sin(n/(l/Math.PI)))>>0; return a; },
		vibrosaw:	function(v,l){ var a = new Array(l); var n = l; while(--n >= 0) a[n] = (n%4?1:0)*(v - (v*(Math.abs(l/2-n)/l)-.5>>0)); return a; },
		noise:		function(v,l){ var a = new Array(l); var n = 1; while(--n >= 0) a[n] = (v*Math.random())>>0; return a; }
	};
	
	// Tone generator
	function wavGen(len, tone, inst, poly, vol) {
		vol = vol ? vol : 64;
		if(inst) curInst = inst;
		var freq = Math.pow(Math.pow(2,1/12), tone) * 220;
		var lenSamples = len * 44100 | 0;
		var samplePartLen = 44100 / freq  | 0;
		
		
		var loSamplePart = Instr[curInst].apply(0,[127-(vol%127),samplePartLen]);
		var hiSamplePart = Instr[curInst].apply(0,[127+(vol%127),samplePartLen]);
		
		var out = [];
		for(; out.length < lenSamples - 100; out = out.concat(loSamplePart,hiSamplePart));
		out = out.slice(0, lenSamples - 101);
		if(poly) {
			var out2 = wavGen(len, poly, inst, null, vol);
			var n = out.length; while(--n >= 0) out[n] = 127+(((out[n]-127)+(out2[n]-127))/2);
		}
		return out;
	}
	
	var songs = {};
	var tracks = {};
	var songRef = null;
	var track = null;
	var loop = true;
	var loopID = null;
	var curInst = 'square';
	
	
	function buildSong(notes) {
		var cache = {};
		var raw = '';

		// loop to generate appropriate tones
		for(var j = 0; j <= notes.length; j++) {
			if(!cache[notes[j]]) cache[notes[j]] = atos(wavGen.apply(0, notes[j]));
			raw += cache[notes[j]];
		}

		// if already playing something, stop...
		if(track != null) track.pause();
		if(loopID != null) { clearInterval(loopID); loopID = null; }
		
		// TODO: We should support AIF and WAV output. Some platforms do not work natively with WAV and vice-versa.
		track = new Audio("data:audio/wav;base64,UklGRmisAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0" + btoa( "a"
			+ String.fromCharCode(raw.length&0xff)
			+ String.fromCharCode(raw.length>>8&0xff)
			+ String.fromCharCode(raw.length>>16&0xff)
			+ String.fromCharCode(raw.length>>24&0xff)
			+ raw)
		);
		//track.play();
		tracks[songRef] = track;
	}
	
	function startLoop() {
		var l, i;
		if(loopID != null) { clearInterval(loopID); loopID = null; }
		for(l = i = 0; i < songs[songRef].length; l+=songs[songRef][i][0],i++);
		loopID = setInterval(function() {track.play();},(l+1)*1000); // jitter teh loop just a bit (+100 ms) to avoid firing play() before it's over
	}
	
	// control
	this.setTrack = function(t) {
		songRef = t;
		
		if(!tracks[t] && songs[t]) buildSong(songs[t]);
		
		if(tracks[t]) {
			this.pause();
			track = tracks[t];
			this.play();
		}
	}
	// TODO: Add timers to sync loops with the pause/play
	this.addTrack = function(n, t) { songs[n] = t; }
	this.setLoop = function(l) { loop = l ? true : false; }
	this.play = function() { if(track != null) track.play(); if(loop) startLoop(); };
	this.pause = function() { if(track != null) track.pause(); if(loopID != null) { clearInterval(loopID); loopID = null; } };
	
	this.setInst = function(i) { curInst = i; };
})();
