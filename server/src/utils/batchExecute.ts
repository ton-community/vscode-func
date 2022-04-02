export async function batchExecute<R>(tasks: (() => Promise<R>)[], factor: number): Promise<R[]> {
	let result: R[] = [];
	let pos = 0;
	while (true) {
		const partTasks = tasks.slice(pos, pos + factor);
		if (partTasks.length === 0) {
			break;
		}
		const partResult = await Promise.all(partTasks.map(task => task()));
		pos += factor;
		result.push(...partResult);
	}
	return result;
}