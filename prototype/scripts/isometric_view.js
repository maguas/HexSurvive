export class IsometricView {
    constructor(canvasId, grid) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.grid = grid;
        this.scaleY = 0.8; // Flatten Y for isometric look
        this.tileHeight = 30; // Height of the 3D tile
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Convert flat hex pixel coordinates to isometric view coordinates
    toIso(x, y) {
        const cy = this.grid.offsetY;
        return {
            x: x,
            y: cy + (y - cy) * this.scaleY
        };
    }

    // Convert isometric screen coordinates back to flat hex pixel coordinates
    // Account for tile height since the top face is drawn at y - tileHeight
    isoToFlat(x, y) {
        const cy = this.grid.offsetY;
        // Add tileHeight to compensate for the raised top face
        const adjustedY = y + this.tileHeight;
        return {
            x: x,
            y: cy + (adjustedY - cy) / this.scaleY
        };
    }

    drawTile(q, r, tileData, isSelected = false, players = null) {
        const center = this.grid.hexToPixel(q, r);
        const isoCenter = this.toIso(center.x, center.y);
        const size = this.grid.hexSize;
        const ctx = this.ctx;

        // Draw side faces (3D effect)
        if (!tileData.revealed) {
            this.drawHexPrism(isoCenter.x, isoCenter.y, size, this.tileHeight, "#1a1a1a", "#0d0d0d");
        } else {
            const color = this.grid.getTileColor(tileData.type);
            const darkenColor = this.shadeColor(color, -20);
            this.drawHexPrism(isoCenter.x, isoCenter.y, size, this.tileHeight, color, darkenColor);
        }

        // Draw Top Face
        this.drawHexFace(isoCenter.x, isoCenter.y - this.tileHeight, size, tileData.revealed ? this.grid.getTileColor(tileData.type) : "#222", isSelected);

        // Draw contents on top of the tile
        const contentY = isoCenter.y - this.tileHeight;

        // Draw Outpost (Cube)
        if (tileData.outpost && players) {
            const owner = players.find(p => p.id === tileData.ownerId);
            const color = owner ? owner.color : "#00ff00";
            // Draw cube offset to the right so it doesn't hide the number
            this.drawCube(isoCenter.x + 20, contentY - 5, 14, color);
        }

        if (!tileData.revealed) {
            // Draw Level Badge
            if (tileData.encounterLevel) {
                this.drawBadge(isoCenter.x, contentY, tileData.encounterLevel);
            }
        } else {
            this.grid.drawTileInfo(isoCenter.x, contentY, tileData, ctx);
        }
    }

    drawHexFace(x, y, size, color, isSelected) {
        const ctx = this.ctx;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;
            const px = x + size * Math.cos(angle_rad);
            const py = y + size * Math.sin(angle_rad) * this.scaleY;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Highlight: White overlay instead of yellow border
        if (isSelected) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 1;
        } else {
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
        }
        ctx.stroke();
    }

    drawHexPrism(x, y, size, height, topColor, sideColor) {
        const ctx = this.ctx;
        // Only draw the front-facing sides (bottom 3 sides: indices 1, 2, 3)
        // These are the sides visible from the top-down isometric view
        const visibleIndices = [1, 2, 3];
        
        for (let i of visibleIndices) {
            const angle_deg1 = 60 * i - 30;
            const angle_rad1 = Math.PI / 180 * angle_deg1;
            const x1 = x + size * Math.cos(angle_rad1);
            const y1 = y + size * Math.sin(angle_rad1) * this.scaleY;
            
            const angle_deg2 = 60 * ((i + 1) % 6) - 30;
            const angle_rad2 = Math.PI / 180 * angle_deg2;
            const x2 = x + size * Math.cos(angle_rad2);
            const y2 = y + size * Math.sin(angle_rad2) * this.scaleY;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x2, y2 - height);
            ctx.lineTo(x1, y1 - height);
            ctx.closePath();
            ctx.fillStyle = sideColor;
            ctx.fill();
        }
    }

    drawCube(x, y, size, color) {
        const ctx = this.ctx;
        const h = size; // height of cube
        
        // Top Face
        ctx.beginPath();
        ctx.moveTo(x, y - h);
        ctx.lineTo(x + size, y - h - size * 0.5);
        ctx.lineTo(x, y - h - size);
        ctx.lineTo(x - size, y - h - size * 0.5);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();

        // Right Face
        ctx.beginPath();
        ctx.moveTo(x, y - h);
        ctx.lineTo(x + size, y - h - size * 0.5);
        ctx.lineTo(x + size, y - size * 0.5);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fillStyle = this.shadeColor(color, -20);
        ctx.fill();
        ctx.stroke();

        // Left Face
        ctx.beginPath();
        ctx.moveTo(x, y - h);
        ctx.lineTo(x - size, y - h - size * 0.5);
        ctx.lineTo(x - size, y - size * 0.5);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fillStyle = this.shadeColor(color, -40);
        ctx.fill();
        ctx.stroke();
    }

    drawHemisphere(x, y, radius, color) {
        const ctx = this.ctx;
        const h = radius * 0.8; // height visual adjustment
        
        // Draw simplified sphere/hemisphere
        ctx.beginPath();
        ctx.arc(x, y - h, radius, 0, Math.PI * 2);
        
        // Gradient for 3D effect
        const grad = ctx.createRadialGradient(x - radius/3, y - h - radius/3, radius/10, x, y - h, radius);
        grad.addColorStop(0, "#fff");
        grad.addColorStop(0.3, color);
        grad.addColorStop(1, this.shadeColor(color, -50));
        
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw shadow
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fill();
    }

    drawBadge(x, y, level) {
        const levelColors = { 1: "#4CAF50", 2: "#FFC107", 3: "#F44336" };
        const ctx = this.ctx;
        
        ctx.fillStyle = levelColors[level] || "#888";
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(level, x, y);
    }

    shadeColor(color, percent) {
        let R = parseInt(color.substring(1,3),16);
        let G = parseInt(color.substring(3,5),16);
        let B = parseInt(color.substring(5,7),16);

        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);

        R = (R<255)?R:255;  
        G = (G<255)?G:255;  
        B = (B<255)?B:255;  

        const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
        const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
        const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

        return "#"+RR+GG+BB;
    }

    drawEdgeHighlight(q, r, edgeIndex, color = "rgba(255, 255, 255, 0.8)") {
        const { x, y } = this.grid.hexToPixel(q, r);
        const size = this.grid.hexSize;
        
        // Calculate the two corners of the edge in flat space
        const angle1 = (60 * edgeIndex - 30) * (Math.PI / 180);
        const angle2 = (60 * ((edgeIndex + 1) % 6) - 30) * (Math.PI / 180);

        const x1_flat = x + size * Math.cos(angle1);
        const y1_flat = y + size * Math.sin(angle1);
        const x2_flat = x + size * Math.cos(angle2);
        const y2_flat = y + size * Math.sin(angle2);

        // Convert to Iso
        const p1 = this.toIso(x1_flat, y1_flat);
        const p2 = this.toIso(x2_flat, y2_flat);

        // Draw on top face (subtract tileHeight)
        const h = this.tileHeight;
        
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y - h);
        this.ctx.lineTo(p2.x, p2.y - h);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
    }

    drawHero(q, r, edgeIndex, playerColor, playerName) {
        const pos = this.grid.getEdgeMidpoint(q, r, edgeIndex); // Flat coords
        const isoPos = this.toIso(pos.x, pos.y); // Iso coords
        
        // Draw hero on top of the tile (subtract tileHeight)
        this.drawHemisphere(isoPos.x, isoPos.y - this.tileHeight, 10, playerColor);
        
        // Draw player initial
        this.ctx.fillStyle = "#fff";
        this.ctx.font = "bold 10px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(playerName ? playerName[0] : "H", isoPos.x, isoPos.y - this.tileHeight - 5);
    }

    render(mapData, selectedHex = null, players = null, hoveredEdge = null) {
        this.clear();
        
        // Sort tiles by isometric depth for painter's algorithm
        // In isometric view, tiles further back (smaller screen Y) should be drawn first
        const sortedKeys = Array.from(mapData.keys()).sort((a, b) => {
            const [q1, r1] = a.split(',').map(Number);
            const [q2, r2] = b.split(',').map(Number);
            // Calculate screen Y position for each tile
            const center1 = this.grid.hexToPixel(q1, r1);
            const center2 = this.grid.hexToPixel(q2, r2);
            const isoY1 = this.toIso(center1.x, center1.y).y;
            const isoY2 = this.toIso(center2.x, center2.y).y;
            return isoY1 - isoY2;
        });

        sortedKeys.forEach(key => {
            const [q, r] = key.split(',').map(Number);
            const tile = mapData.get(key);
            const isSelected = selectedHex && selectedHex.q === q && selectedHex.r === r;
            this.drawTile(q, r, tile, isSelected, players);
        });
        
        // Draw Edge Highlight
        if (hoveredEdge) {
            this.drawEdgeHighlight(hoveredEdge.q, hoveredEdge.r, hoveredEdge.edgeIndex);
        }
        
        // Draw players
        if (players) {
            players.forEach(player => {
                if (player.hero.location) {
                    const loc = player.hero.location;
                    this.drawHero(loc.q, loc.r, loc.edgeIndex, player.color, player.name);
                }
            });
        }
    }
}
