import { Quadtree, Rectangle }  from '@timohausmann/quadtree-ts';
import * as sat from "sat";
export {sat};
export let shapes = [];
export let tree = new Quadtree({
	x: 0,
	y: 0,
	width: 640,
	height: 480
});

//add place_meeting_list
//add type
export function updateTouching(shape){
    var response = place_meeting_list(shape,shape.pos.x,shape.pos.y,"all");
    shape.touchingPrev = shape.touching;
    shape.touching = [];
    if(!response){
        return;
    }
    //console.log(response);
    if(shape instanceof composite){
        
        for(var g of response){
            for(var i of g){
                shape.touching.push(i.b);
            }
        }
    } else{
        for(var g of response){
            shape.touching.push(g.b);
        }
    }
    
}
export function just_touch(shape,tags){
    if (typeof tags != "array"){
        tags = [tags];
    }
    daddy:
    for(var i of shape.touching){
        var gotTag = false;
        tagloop:
        for(var v of i.tags){
            for(var g of tags){
                if(v == g || g == "all"){
                    gotTag = true;
                    break tagloop;
                }
            }
        }
        if(!gotTag){
            continue;
        }
        for(var g of shape.touchingPrev){

            if(g == i){
                
                continue daddy;
            }
            
        }
        return i;
    }
    return undefined;
}
export function just_touch_list(shape,tags){
    if (typeof tags != "array"){
        tags = [tags];
    }
    var touches = [];
    daddy:
    for(var i of shape.touching){
        var gotTag = false;
        //console.log(i);
        tagloop:
        for(var v of i.tags){
            for(var g of tags){
                if(v == g || g == "all"){
                    gotTag = true;
                    break tagloop;
                }
            }
        }
        if(!gotTag){
            continue;
        }
        for(var g of shape.touchingPrev){

            if(g == i){
                
                continue daddy;
            }
            
        }
        touches.push(i);
    }
    if(touches.length == 0){
        return undefined;
    }
    return touches;
}
export function box(x,y,tags,data,width,height,offset = new sat.Vector()){
    var r = new sat.Box(new sat.Vector(x,y),width,height).toPolygon();
    r.setOffset(offset);
    r.tags = tags;
    r.data = data;
    r.touching = [];
    r.touchingResponse = [];
    r.touchingPrev = [];
    return r;
}
export function polygon(x,y,tags,data,points,offset = new sat.Vector()){
    var r =  new sat.Polygon(new sat.Vector(x,y),points);
    r.setOffset(offset);
    r.tags = tags;
    r.data = data;
    r.touching = [];
    r.touchingResponse = [];
    r.touchingPrev = [];
    return r;
}
export function circle(x,y,tags,data,radius,offset = new sat.Vector()){
    var r =  new sat.Circle(new sat.Vector(x,y),radius);
    r.setOffset(offset);
    r.tags = tags;
    r.data = data;
    r.touching = [];
    r.touchingResponse = [];
    r.touchingPrev = [];
    return r;
}
export function composite(x,y,tags,data,shapes){

    this.tags = tags;
    this.data = data;
    console.log(tags);
    this.pos = new sat.Vector(x,y);
    this.shapes = shapes;
    for(var i of this.shapes){
        i.tags = this.tags;
    }
    this.offset = 0;
    this.angle = 0;
    this.touching = [];
    this.touchingResponse = [];
    this.touchingPrev = [];
}
composite.prototype.setTags = (tags) =>{
    this.tags = tags;
    for(var i of this.shapes){
        i.tags = this.tags;
    }
}
composite.prototype.addTag = (tag) =>{
    this.tags.push(tag);
    for(var i of this.shapes){
        i.tags.push(tag);
    }
}
export function concavePolygon(x,y,points){
    var convertedPoints = [];
    for(var i of points){
        convertedPoints = convertedPoints.concat([i.x,i.y]);
    }
    var delaunay = new Delaunator(convertedPoints);

    var currentTriangle = [];
    var polygons = [];
    for(var i = 0; i < delaunay.triangles.length; i+=2){
        var x = delaunay.triangles[i+1];
        var y = delaunay.triangles[i+2];
        currentTriangle.push(new sat.Vector(x,y));
        if(currentTriangle.length == 3){
            polygons.push(polygon(x,y,[],currentTriangle));
            currentTriangle = [];
        }
    }
    return polygons;
}
export function testCollision (a,b) {
    var result = undefined;
    var response = new sat.Response();
    if(a instanceof sat.Polygon){
        if(b instanceof sat.Polygon){
            var collided = sat.testPolygonPolygon(a,b,response);
            if(collided){
                response.collided = true;
                response.type = "polygonPolygon";
                result = response;
                return result;

            }
        }
        if(b instanceof sat.Circle){
            var collided = sat.testPolygonCircle(a,b,response);
            if(collided){
                response.collided = true;
                result = response;
                response.type = "polygonCircle";
                return result;

            }
        }
        
    }
    if(a instanceof sat.Circle){
        if(b instanceof sat.Polygon){
            var collided = sat.testCirclePolygon(a,b,response);
            if(collided){
                response.collided = true;
                response.type = "circlePolygon";
                result = response;
                return result;

            }
        }
        if(b instanceof sat.Circle){
            var collided = sat.testCircleCircle(a,b,response);
            if(collided){
                response.collided = true;
                response.type = "circleCircle";
                result = response;
                return result;

            }
        }
        
    }
}
export function clone(a){
    if(a instanceof sat.Polygon){
        var points = [];
        for(var i of a.points){
            points.push(i.clone());
        }
        var angle = a.angle;
        var offset = a.offset.clone();
        a = new sat.Polygon(a.pos.clone(),points);
        a.setAngle(angle);
        a.setOffset(a.offset);
    }
    if(a instanceof sat.Circle){
        var offset = a.offset.clone();
        a = new sat.Circle(a.pos.clone(),a.r);
        a.setOffset(a.offset);
    }
    return a;
}
function _place_meeting(a,x,y,tags){
    a = clone(a);
    if (typeof tags != "array"){
        tags = [tags];
    }
    a.pos.x = x;
    a.pos.y = y;
    var aabb = a.getAABBAsBox();
    var test = new Rectangle({
        x:aabb.pos.x,
        y:aabb.pos.y,
        width:aabb.w,
        height:aabb.h
    });
    
    
    var result = undefined;
    
    for(var i of tree.retrieve(test)){
        var gotTag = false;
        tagloop:
        for(var v of i.data.tags){
            for(var g of tags){
                if(v == g || g == "all"){
                    gotTag = true;
                    break tagloop;
                }
            }
        }
        
        if(!gotTag){
            continue;
        }
        result = testCollision(a,i.data);
        
        if (result){
            break;
        }
    }
    return result;
}
export function place_meeting (a,x,y,tags) {
    if(a instanceof composite){
        var responses = [];
        for(var i = 0; i < a.shapes.length; ++i){
            var shape = clone(a.shapes[i]);
            shape.offset = shape.offset.add(a.offset);
            shape.angle = shape.angle + a.angle;
            var response = _place_meeting(shape,x,y,tags);
            if(response !== undefined){
                responses.push(response);
            }
        
        }
        return responses;
    } else{
        return _place_meeting(a,x,y,tags);
    }
}
function _place_meeting_list(a,x,y,tags){
    a = clone(a);
    if (typeof tags != "array"){
        tags = [tags];
    }
    a.pos.x = x;
    a.pos.y = y;
    var aabb = a.getAABBAsBox();
    var test = new Rectangle({
        x:a.pos.x,
        y:a.pos.y,
        width:aabb.w,
        height:aabb.h
    });
    
    var results = [];
    for(var i of tree.retrieve(test)){
        var result = testCollision(a,i.data);
        var gotTag = false;
        tagloop:
        for(var v of i.data.tags){
            for(var g of tags){
                if(v == g || g == "all"){
                    
                    gotTag = true;
                    break tagloop;
                }
            }
        }
        if(!gotTag){
            continue;
        }
        if(result){
            results.push(result);
        }
        
    }
    return results;
}
export function place_meeting_list (a,x,y,tags){
    if(a instanceof composite){
        var responses = [];
        for(var i = 0; i < a.shapes.length; ++i){
            var shape = clone(a.shapes[i]);
            shape.offset = shape.offset.add(a.offset);
            shape.angle = shape.angle + a.angle;
            var response = _place_meeting_list(shape,x,y,tags);
            if(response !== undefined){
                responses.push(response);
            }
            
        }
        if(responses.length == 0){
            
            return undefined;
        }
        
        return responses;
    } else{
        return _place_meeting_list(a,x,y,tags);
    }
}
export function reinsert () {
    tree.clear();
    
    for(var i of shapes){
        var aabb = i.getAABBAsBox();

        tree.insert(
            new Rectangle({
                x:aabb.pos.x,
                y:aabb.pos.y,
                width:aabb.w,
                height:aabb.h,
                data:i
            })
        )
        /*{
            x:i.pos.x,
            y:i.pos.y,
            width:aabb.w,
            height:aabb.h
        }*/
    }
}