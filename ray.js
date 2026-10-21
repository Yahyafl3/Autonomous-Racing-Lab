

// Pour le raycasting, voir vidéo de Daniel Shiffman
// sur le sujet : https://www.youtube.com/watch?v=TOEi6T2mtHo
class Ray {
    constructor(pos, angle) {
      this.pos = pos;
      this.angle = angle;
      this.dir = p5.Vector.fromAngle(angle);
    }
  
    // On regarde dans une direction donnée
    lookAt(x, y) {
      this.dir.x = x - this.pos.x;
      this.dir.y = y - this.pos.y;
      this.dir.normalize();
    }
  
    rotate(offset) {
      this.dir = p5.Vector.fromAngle(this.angle + offset);
    }
  
    // Rendu des rayons laser cyan haute intensité (effet laser futuriste & halo)
    show(hitPoint, d, maxSight) {
      const sightDist = maxSight || (typeof SIGHT !== 'undefined' ? SIGHT : 100);
      push();
      translate(this.pos.x, this.pos.y);
      if (hitPoint) {
        const dx = hitPoint.x - this.pos.x;
        const dy = hitPoint.y - this.pos.y;

        // 1. Halo externe diffus laser cyan
        stroke(0, 240, 255, 50);
        strokeWeight(4.5);
        line(0, 0, dx, dy);

        // 2. Faisceau laser cyan électrique principal
        stroke(0, 240, 255, 220);
        strokeWeight(2);
        line(0, 0, dx, dy);

        // 3. Coeur laser ultra-brillant cyan/blanc
        stroke(225, 250, 255, 250);
        strokeWeight(1);
        line(0, 0, dx, dy);

        // 4. Point d'impact laser : réticule & étincelle d'énergie cyan
        noStroke();
        fill(0, 240, 255, 100);
        ellipse(dx, dy, 10, 10);
        fill(0, 240, 255, 220);
        ellipse(dx, dy, 6, 6);
        fill(255, 255, 255, 255);
        ellipse(dx, dy, 3, 3);
      } else {
        // Faisceau de portée lointaine en cyan élégant
        stroke(0, 240, 255, 55);
        strokeWeight(1.4);
        line(0, 0, this.dir.x * sightDist, this.dir.y * sightDist);

        // Pointe de balayage laser
        noStroke();
        fill(0, 240, 255, 120);
        ellipse(this.dir.x * sightDist, this.dir.y * sightDist, 3, 3);
      }
      pop();
    }
  
    // On regarde si le rayon intersecte un mur
    // si oui on renvoie le point d'intersection
    cast(wall) {
      const x1 = wall.a.x;
      const y1 = wall.a.y;
      const x2 = wall.b.x;
      const y2 = wall.b.y;
  
      const x3 = this.pos.x;
      const y3 = this.pos.y;
      const x4 = this.pos.x + this.dir.x;
      const y4 = this.pos.y + this.dir.y;
  
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (den == 0) {
        return;
      }
  
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;
      if (t > 0 && t < 1 && u > 0) {
        const pt = createVector();
        pt.x = x1 + t * (x2 - x1);
        pt.y = y1 + t * (y2 - y1);
        return pt;
      } else {
        return;
      }
    }
  }