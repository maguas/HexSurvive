export class HexGrid {
    constructor(canvasId, width, height) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = width;
        this.canvas.height = height;
        this.hexSize = 45;
        this.tiles = new Map();
        this.offsetX = width / 2;
        this.offsetY = height / 2;
        this.sqrt3 = Math.sqrt(3);
        this.selectedHex = null;
    }

    hexToPixel(q, r) {
        const x = this.hexSize * (this.sqrt3 * q + this.sqrt3 / 2 * r);
        const y = this.hexSize * (3 / 2 * r);
        return { x: x + this.offsetX, y: y + this.offsetY };
    }

    pixelToHex(mouseX, mouseY) {
        const x = mouseX - this.offsetX;
        const y = mouseY - this.offsetY;
        
        const q = (this.sqrt3 / 3 * x - 1 / 3 * y) / this.hexSize;
        const r = (2 / 3 * y) / this.hexSize;
        
        return this.cubeRound({ q, r, s: -q - r });
    }

    cubeRound(frac) {
        let q = Math.round(frac.q);
        let r = Math.round(frac.r);
        let s = Math.round(frac.s);

        const q_diff = Math.abs(q - frac.q);
        const r_diff = Math.abs(r - frac.r);
        const s_diff = Math.abs(s - frac.s);

        if (q_diff > r_diff && q_diff > s_diff) {
            q = -r - s;
        } else if (r_diff > s_diff) {
            r = -q - s;
        } else {
            s = -q - r;
        }
        return { q, r };
    }

    drawHex(q, r, tileData, isSelected = false) {
        const { x, y } = this.hexToPixel(q, r);
        const ctx = this.ctx;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;
            const px = x + this.hexSize * Math.cos(angle_rad);
            const py = y + this.hexSize * Math.sin(angle_rad);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Fill based on revealed status
        if (!tileData.revealed) {
            ctx.fillStyle = "#1a1a1a";
            ctx.fill();
            ctx.strokeStyle = "#333";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Fog pattern
            ctx.fillStyle = "rgba(50, 50, 50, 0.5)";
            ctx.fill();
        } else {
            // Revealed tile
            ctx.fillStyle = this.getTileColor(tileData.type);
            ctx.fill();
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw tile info
            this.drawTileInfo(x, y, tileData);
        }

        // Selection highlight
        if (isSelected) {
            ctx.strokeStyle = "#ffff00";
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Draw outpost if present
        if (tileData.outpost) {
            ctx.fillStyle = "#00ff00";
            ctx.beginPath();
            ctx.arc(x - 15, y - 15, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw alien patrol if present
        if (tileData.alienPatrol) {
            ctx.fillStyle = "#ff0000";
            ctx.font = "bold 20px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("👽", x, y - 25);
        }
    }

    drawTileInfo(x, y, tileData) {
        const ctx = this.ctx;

        // Number token
        if (tileData.numberToken) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.beginPath();
            ctx.arc(x, y, 16, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = "#000";
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(tileData.numberToken, x, y);
        }

        // Type label
        ctx.fillStyle = "#fff";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(tileData.type.toUpperCase(), x, y + 26);

        // Level indicator
        if (tileData.level !== undefined && tileData.level !== null && tileData.level > 0) {
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 11px Arial";
            ctx.fillText(`Lvl ${tileData.level}`, x, y - 26);
        }
    }

    getTileColor(type) {
        switch (type) {
            case 'ruins': return '#7f8c8d';
            case 'wasteland': return '#d35400';
            case 'overgrown': return '#27ae60';
            case 'crash_site': return '#8e44ad';
            case 'bunker': return '#2980b9';
            case 'desert': return '#f39c12';
            default: return '#95a5a6';
        }
    }

    render(mapData, selectedHex = null) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        mapData.forEach((tile, key) => {
            const [q, r] = key.split(',').map(Number);
            const isSelected = selectedHex && selectedHex.q === q && selectedHex.r === r;
            this.drawHex(q, r, tile, isSelected);
        });
    }

    getResourceIcon(type) {
        switch (type) {
            case 'ruins': return '🔩';
            case 'wasteland': return '⚡';
            case 'overgrown': return '🍏';
            case 'crash_site': return '🔮';
            case 'bunker': return '💾';
            default: return '❓';
        }
    }
}
