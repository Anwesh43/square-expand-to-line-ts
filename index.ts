const w : number = window.innerWidth
const h : number = window.innerHeight 
const lines : number = 4
const scGap : number = 0.02 / lines 
const strokeFactor : number = 90 
const sizeFactor : number = 1.3 
const squareSizeFactor : number = 15.9 
const delay : number = 20 
const backColor : string = "#bdbdbd"
const colors : Array<string> = [
    "#f44336",
    "#2196F3",
    "#BF360C",
    "#00C853",
    "#311B92"
]

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }

    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n 
    }

    static sinify(scale : number) : number {
        return Math.sin(scale * Math.PI)
    }
}

class DrawingUtil {
    
    static drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }
    
    static drawSquareExpandFromStart(context : CanvasRenderingContext2D, scale : number) {
        const size : number = Math.min(w, h) / sizeFactor 
        const sf : number = ScaleUtil.sinify(scale)
        const gap : number = size / (lines)
        const squareSize : number = Math.min(w, h) / squareSizeFactor 
        context.save()
        context.translate(w / 2, h / 2)
        context.rotate(Math.PI * ScaleUtil.divideScale(sf, lines, lines + 1))
        for (var j = 0; j < lines; j++) {
            const sfj : number = ScaleUtil.divideScale(sf, j, lines + 1)
            const sfj1 : number = ScaleUtil.divideScale(sfj, 0, 2)
            const sfj2 : number = ScaleUtil.divideScale(sfj, 1, 2)
            const lSize : number = (gap * (j + 1)) / (lines)
            context.save()
            context.translate(0, size / 2 - (gap) * j)
            for (var k = 0; k < 2; k++) {
                context.save()
                context.scale(1 - 2 * k, 1)
                context.translate(-lSize * sfj2, 0)
                context.fillRect(-squareSize * 0.5 * sfj1, -squareSize * 0.5 * sfj1, squareSize * sfj1, squareSize * sfj1)
                context.restore()
            }
            DrawingUtil.drawLine(context, -lSize * sfj2, 0, lSize * sfj2, 0)
            context.restore()
        }
        context.restore()
    } 

    static drawSEFSNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        context.lineCap = 'round'
        context.lineWidth = Math.min(w, h) / strokeFactor 
        context.strokeStyle = colors[i]
        context.fillStyle = colors[i]
        DrawingUtil.drawSquareExpandFromStart(context, scale)
    }
}

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D 
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w 
        this.canvas.height = h 
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor 
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {

    scale : number = 0 
    dir : number = 0 
    prevScale : number = 0 

    update(cb : Function) {
        this.scale += scGap * this.dir 
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir 
            this.dir = 0 
            this.prevScale = this.scale 
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale 
            cb()
        }
    }
}

class Animator {

    animated : boolean = false 
    interval : number 

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true 
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false 
            clearInterval(this.interval)
        } 
    }
}

class SEFSNode {

    prev : SEFSNode 
    next : SEFSNode 
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < colors.length - 1) {
            this.next = new SEFSNode(this.i + 1)
            this.next.prev = this 
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawSEFSNode(context, this.i, this.state.scale)
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : SEFSNode {
        var curr : SEFSNode = this.prev 
        if (dir == 1) {
            curr = this.next 
        }
        if (curr) {
            return curr 
        }
        cb()
        return this 
    }
}

class SquareExpandFromStart {

    curr : SEFSNode = new SEFSNode(0)
    dir : number = 1 

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {

    animator : Animator = new Animator()
    sefs : SquareExpandFromStart = new SquareExpandFromStart()

    render(context : CanvasRenderingContext2D) {
        this.sefs.draw(context)
    }

    handleTap(cb : Function) {
        this.sefs.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.sefs.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}